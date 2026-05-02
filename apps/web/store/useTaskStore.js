"use client";
/**
 * useTaskStore
 * ============
 * Zustand store for task management with full optimistic UI.
 *
 * Optimistic strategy
 * -------------------
 *   CREATE  — inserts a temp item (id = "tmp_<n>") immediately; replaces with the
 *             real item on HTTP success; removes temp item on failure.
 *   UPDATE  — patches state immediately from a snapshot; reverts on failure.
 *   MOVE    — same as UPDATE but only touches `status`.
 *   DELETE  — removes item immediately; re-inserts snapshot on failure.
 *
 * Conflict resolution — socket vs. optimistic
 * --------------------------------------------
 *   Module-level `_pending` Set tracks itemIds currently being mutated by
 *   THIS client via HTTP.  When a socket event arrives for an item in `_pending`,
 *   it is **skipped** — the in-flight HTTP response is the authoritative source.
 *   Once the HTTP call settles (success or rollback), the id is removed from
 *   `_pending` and future socket events apply normally.
 *
 *   Race matrix:
 *   ┌─────────────────────┬─────────────────────────────────────────────────┐
 *   │ Scenario            │ Outcome                                         │
 *   ├─────────────────────┼─────────────────────────────────────────────────┤
 *   │ HTTP faster         │ Socket arrives → _pending hit → skipped.        │
 *   │                     │ UI already has authoritative data. ✓             │
 *   ├─────────────────────┼─────────────────────────────────────────────────┤
 *   │ Socket faster       │ Socket arrives → _pending hit → skipped.        │
 *   │                     │ HTTP response replaces optimistic state. ✓       │
 *   ├─────────────────────┼─────────────────────────────────────────────────┤
 *   │ Other user edits    │ Not in _pending → socket applied immediately. ✓ │
 *   ├─────────────────────┼─────────────────────────────────────────────────┤
 *   │ HTTP fails          │ Rollback to snapshot + error toast. ✓           │
 *   ├─────────────────────┼─────────────────────────────────────────────────┤
 *   │ CREATE socket race  │ _socketAdd guards by id — no duplicate. ✓       │
 *   ├─────────────────────┼─────────────────────────────────────────────────┤
 *   │ DELETE socket       │ Always applied — idempotent filter. ✓           │
 *   └─────────────────────┴─────────────────────────────────────────────────┘
 *
 * Toasts
 * ------
 *   All rollback errors push to the shared `useToastStore`.
 *   Mount `<ToastRegion />` once in the dashboard layout.
 */
import { create } from "zustand";
import { fetchTasks, createTaskReq, updateTaskReq, deleteTaskReq } from "../lib/api";
import { useToastStore } from "./useToastStore";

// ── Coordination set (not Zustand state — changes must not trigger re-renders) ─
// Holds itemIds currently being mutated by THIS client via an in-flight HTTP call.
const _pending = new Set();

// ── Tiny temp-ID helper ───────────────────────────────────────────────────────
let _seq = 0;
function tmpId() { return `tmp_${++_seq}_${Date.now()}`; }

// ── Shorthand to push to the shared toast queue ───────────────────────────────
function toast(message, type = "error") {
  useToastStore.getState().push(message, type, "task");
}

export const useTaskStore = create((set, get) => ({
  items:   [],
  total:   0,
  loading: false,
  saving:  false,
  error:   null,

  // ── Fetch ──────────────────────────────────────────────────────────────────
  fetchTasks: async (workspaceId, params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchTasks(workspaceId, params);
      set({ items: data.items, total: data.total });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  // ── Optimistic Create ──────────────────────────────────────────────────────
  createTask: async (workspaceId, payload) => {
    const tempId     = tmpId();
    const optimistic = {
      ...payload,
      id:          tempId,
      _optimistic: true,   // consumed by UI for visual pending hint
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      assignee:    null,
      goal:        null,
    };

    // 1. Insert temp item immediately
    set((s) => ({ items: [optimistic, ...s.items], total: s.total + 1, saving: true, error: null }));

    try {
      const item = await createTaskReq(workspaceId, payload);

      // 2. Replace temp with real item.
      //    Guard: socket _socketAdd may have already swapped the item in.
      set((s) => {
        const alreadyReal = s.items.some((i) => i.id === item.id);
        return {
          items: alreadyReal
            ? s.items.filter((i) => i.id !== tempId)               // socket beat us; drop temp
            : s.items.map((i) => (i.id === tempId ? item : i)),    // normal path; swap
          saving: false,
        };
      });
      return item;
    } catch (err) {
      // 3. Rollback
      const msg = err?.response?.data?.error ?? "Failed to create task";
      set((s) => ({
        items:  s.items.filter((i) => i.id !== tempId),
        total:  Math.max(0, s.total - 1),
        saving: false,
        error:  msg,
      }));
      toast(msg);
      throw err;
    }
  },

  // ── Optimistic Update ──────────────────────────────────────────────────────
  updateTask: async (workspaceId, itemId, payload) => {
    const prev = get().items.find((i) => i.id === itemId);

    // 1. Mark in-flight; optimistically patch
    _pending.add(itemId);
    set((s) => ({
      items:  s.items.map((i) => (i.id === itemId ? { ...i, ...payload, _optimistic: true } : i)),
      saving: true,
    }));

    try {
      const updated = await updateTaskReq(workspaceId, itemId, payload);
      set((s) => ({ items: s.items.map((i) => (i.id === itemId ? updated : i)), saving: false }));
      return updated;
    } catch (err) {
      // 2. Rollback to previous snapshot
      const msg = err?.response?.data?.error ?? "Failed to update task";
      set((s) => ({
        items:  prev
          ? s.items.map((i) => (i.id === itemId ? prev : i))
          : s.items.filter((i) => i.id !== itemId),
        saving: false,
        error:  msg,
      }));
      toast(msg);
      throw err;
    } finally {
      _pending.delete(itemId);
    }
  },

  // ── Move — optimistic drag-drop status change ─────────────────────────────
  moveTask: async (workspaceId, itemId, newStatus) => {
    const prev = get().items.find((i) => i.id === itemId);
    if (!prev || prev.status === newStatus) return;

    // 1. Mark in-flight; optimistic status change
    _pending.add(itemId);
    set((s) => ({
      items: s.items.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i)),
    }));

    try {
      const updated = await updateTaskReq(workspaceId, itemId, { status: newStatus });
      set((s) => ({ items: s.items.map((i) => (i.id === itemId ? updated : i)) }));
    } catch {
      // 2. Revert on failure
      set((s) => ({
        items: s.items.map((i) => (i.id === itemId ? { ...i, status: prev.status } : i)),
      }));
      toast("Failed to move task — changes reverted");
    } finally {
      _pending.delete(itemId);
    }
  },

  // ── Optimistic Delete ─────────────────────────────────────────────────────
  deleteTask: async (workspaceId, itemId) => {
    const prev      = get().items.find((i) => i.id === itemId);
    const prevTotal = get().total;

    // 1. Remove immediately
    set((s) => ({
      items: s.items.filter((i) => i.id !== itemId),
      total: Math.max(0, s.total - 1),
    }));

    try {
      await deleteTaskReq(workspaceId, itemId);
    } catch (err) {
      // 2. Rollback — re-insert previous snapshot (append; original position is unknown)
      const msg = err?.response?.data?.error ?? "Failed to delete task";
      set((s) => ({
        items: prev ? [...s.items, prev] : s.items,
        total: prevTotal,
        error: msg,
      }));
      toast(msg);
      throw err;
    }
  },

  // ── Socket mutation helpers ────────────────────────────────────────────────
  // Called by useWorkspaceSocket for events emitted by OTHER users.
  // We skip events for items in `_pending` because our in-flight HTTP response
  // is the authoritative source for those mutations.

  /** New task from another user — skip if already present (temp or real) */
  _socketAdd: (item) => {
    set((s) => {
      if (s.items.some((i) => i.id === item.id)) return {};
      return { items: [item, ...s.items], total: s.total + 1 };
    });
  },

  /**
   * Task updated by another user (or our own action echoed back via socket).
   * Skip if this item is currently in-flight (`_pending`) — the HTTP response
   * will reconcile state once it resolves.
   */
  _socketUpdate: (item) => {
    if (_pending.has(item.id)) return;  // in-flight: ignore echo
    set((s) => ({
      items: s.items.map((i) => (i.id === item.id ? item : i)),
    }));
  },

  /** Task deleted by another user — always applied (idempotent filter) */
  _socketDelete: (itemId) => {
    set((s) => ({
      items: s.items.filter((i) => i.id !== itemId),
      total: Math.max(0, s.total - 1),
    }));
  },
}));


