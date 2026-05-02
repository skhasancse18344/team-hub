"use client";
import { create } from "zustand";
import { fetchTasks, createTaskReq, updateTaskReq, deleteTaskReq } from "../lib/api";

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

  // ── Create ─────────────────────────────────────────────────────────────────
  createTask: async (workspaceId, payload) => {
    set({ saving: true, error: null });
    try {
      const item = await createTaskReq(workspaceId, payload);
      set((s) => ({ items: [item, ...s.items], total: s.total + 1 }));
      return item;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  // ── Update ─────────────────────────────────────────────────────────────────
  updateTask: async (workspaceId, itemId, payload) => {
    set({ saving: true });
    try {
      const updated = await updateTaskReq(workspaceId, itemId, payload);
      set((s) => ({ items: s.items.map((i) => (i.id === itemId ? updated : i)) }));
      return updated;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  // ── Move (optimistic drag-drop) ────────────────────────────────────────────
  moveTask: async (workspaceId, itemId, newStatus) => {
    const prev = get().items.find((i) => i.id === itemId);
    if (!prev || prev.status === newStatus) return;

    // Optimistic
    set((s) => ({
      items: s.items.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i)),
    }));

    try {
      const updated = await updateTaskReq(workspaceId, itemId, { status: newStatus });
      set((s) => ({ items: s.items.map((i) => (i.id === itemId ? updated : i)) }));
    } catch {
      // Revert on failure
      set((s) => ({
        items: s.items.map((i) => (i.id === itemId ? { ...i, status: prev.status } : i)),
      }));
    }
  },

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteTask: async (workspaceId, itemId) => {
    try {
      await deleteTaskReq(workspaceId, itemId);
      set((s) => ({
        items: s.items.filter((i) => i.id !== itemId),
        total: Math.max(0, s.total - 1),
      }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    }
  },
}));
