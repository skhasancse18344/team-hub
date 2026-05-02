"use client";
/**
 * useGoalStore
 * ============
 * Zustand store for goals with full optimistic UI + socket reconciliation.
 *
 * Optimistic strategy (mirrors useTaskStore)
 * ------------------------------------------
 *   CREATE  — inserts a temp goal (_optimistic: true) immediately; swaps with
 *             real goal on HTTP success; removes on failure.
 *   UPDATE  — patches goals[] and activeGoal immediately; reverts on failure.
 *   DELETE  — removes from goals[] immediately; re-inserts on failure.
 *   Milestones / comments — NOT optimistic (detail view; latency acceptable).
 *
 * Conflict resolution — socket vs. optimistic
 * --------------------------------------------
 *   Module-level `_pending` Set holds goalIds that have in-flight HTTP calls.
 *   Socket handlers skip items in `_pending`.  The HTTP response reconciles.
 *   See useTaskStore for the full conflict matrix.
 *
 * Toasts
 * ------
 *   All rollbacks push to the shared `useToastStore` with source "goal".
 */
import { create } from "zustand";
import {
  fetchGoals,
  createGoalReq,
  fetchGoal,
  updateGoalReq,
  deleteGoalReq,
  createMilestoneReq,
  updateMilestoneReq,
  deleteMilestoneReq,
  fetchGoalActivity,
  addCommentReq,
  deleteCommentReq,
} from "../lib/api";
import { useToastStore } from "./useToastStore";
import { useAuthStore }  from "./useAuthStore";

// ── Coordination set ──────────────────────────────────────────────────────────
const _pending = new Set();

// ── Temp ID helper ────────────────────────────────────────────────────────────
let _seq = 0;
function tmpId() { return `tmp_goal_${++_seq}_${Date.now()}`; }

// ── Shorthand toast ───────────────────────────────────────────────────────────
function toast(message, type = "error") {
  useToastStore.getState().push(message, type, "goal");
}

export const useGoalStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  goals:       [],
  total:       0,
  activeGoal:  null,
  activity:    [],
  nextCursor:  null,
  filters:     { status: "", priority: "" },
  loading:     false,
  saving:      false,
  error:       null,

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),

  // ── Fetch list ─────────────────────────────────────────────────────────────
  fetchGoals: async (workspaceId, params = {}) => {
    set({ loading: true, error: null });
    try {
      const result = await fetchGoals(workspaceId, params);
      set({ goals: result.goals, total: result.total });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  // ── Optimistic Create ──────────────────────────────────────────────────────
  createGoal: async (workspaceId, payload) => {
    const tempId = tmpId();
    const user   = useAuthStore.getState().user;

    const tempGoal = {
      id:          tempId,
      title:       payload.title ?? "",
      description: payload.description ?? null,
      status:      payload.status   ?? "NOT_STARTED",
      priority:    payload.priority ?? "MEDIUM",
      progress:    0,
      dueDate:     payload.dueDate  ?? null,
      ownerId:     payload.ownerId  ?? user?.id,
      owner:       { id: user?.id, name: user?.name ?? "You", avatarUrl: user?.avatarUrl ?? null },
      workspaceId,
      _count:      { milestones: 0, actionItems: 0, activities: 0 },
      _optimistic: true,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };

    // 1. Insert temp goal immediately
    set((s) => ({ goals: [tempGoal, ...s.goals], total: s.total + 1, saving: true, error: null }));

    try {
      const goal = await createGoalReq(workspaceId, payload);

      // 2. Replace temp with real — guard against socket having swapped it first
      set((s) => {
        const alreadyReal = s.goals.some((g) => g.id === goal.id);
        return {
          goals: alreadyReal
            ? s.goals.filter((g) => g.id !== tempId)
            : s.goals.map((g) => (g.id === tempId ? goal : g)),
          saving: false,
        };
      });
      return goal;
    } catch (err) {
      // 3. Rollback
      const msg = err?.response?.data?.error ?? "Failed to create goal";
      set((s) => ({
        goals:  s.goals.filter((g) => g.id !== tempId),
        total:  Math.max(0, s.total - 1),
        saving: false,
        error:  msg,
      }));
      toast(msg);
      throw err;
    }
  },

  // ── Fetch single goal (detail view) ───────────────────────────────────────
  fetchGoal: async (workspaceId, goalId) => {
    set({ loading: true, error: null, activeGoal: null, activity: [] });
    try {
      const goal = await fetchGoal(workspaceId, goalId);
      set({ activeGoal: goal });
      return goal;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  // ── Optimistic Update ──────────────────────────────────────────────────────
  updateGoal: async (workspaceId, goalId, payload) => {
    const prevGoal   = get().goals.find((g) => g.id === goalId);
    const prevActive = get().activeGoal?.id === goalId ? get().activeGoal : null;

    // 1. Mark in-flight; patch optimistically
    _pending.add(goalId);
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId ? { ...g, ...payload, _optimistic: true } : g
      ),
      activeGoal: s.activeGoal?.id === goalId
        ? { ...s.activeGoal, ...payload, _optimistic: true }
        : s.activeGoal,
      saving: true,
      error:  null,
    }));

    try {
      const updated = await updateGoalReq(workspaceId, goalId, payload);
      set((s) => ({
        goals:      s.goals.map((g) => (g.id === goalId ? updated : g)),
        activeGoal: s.activeGoal?.id === goalId ? updated : s.activeGoal,
        saving:     false,
      }));
      return updated;
    } catch (err) {
      // 2. Rollback to snapshot
      const msg = err?.response?.data?.error ?? "Failed to update goal";
      set((s) => ({
        goals: prevGoal
          ? s.goals.map((g) => (g.id === goalId ? prevGoal : g))
          : s.goals.filter((g) => g.id !== goalId),
        activeGoal: prevActive ?? (s.activeGoal?.id === goalId ? null : s.activeGoal),
        saving:     false,
        error:      msg,
      }));
      toast(msg);
      throw err;
    } finally {
      _pending.delete(goalId);
    }
  },

  // ── Optimistic Delete ─────────────────────────────────────────────────────
  deleteGoal: async (workspaceId, goalId) => {
    const prevGoal   = get().goals.find((g) => g.id === goalId);
    const prevTotal  = get().total;
    const prevActive = get().activeGoal?.id === goalId ? get().activeGoal : null;

    // 1. Remove immediately
    set((s) => ({
      goals:      s.goals.filter((g) => g.id !== goalId),
      total:      Math.max(0, s.total - 1),
      activeGoal: s.activeGoal?.id === goalId ? null : s.activeGoal,
    }));

    try {
      await deleteGoalReq(workspaceId, goalId);
    } catch (err) {
      // 2. Rollback
      const msg = err?.response?.data?.error ?? "Failed to delete goal";
      set((s) => ({
        goals:      prevGoal ? [...s.goals, prevGoal] : s.goals,
        total:      prevTotal,
        activeGoal: prevActive ?? s.activeGoal,
        error:      msg,
      }));
      toast(msg);
      throw err;
    }
  },

  // ── Milestones (non-optimistic — detail view) ──────────────────────────────

  createMilestone: async (workspaceId, goalId, payload) => {
    set({ saving: true, error: null });
    try {
      const milestone = await createMilestoneReq(workspaceId, goalId, payload);
      set((s) => {
        if (s.activeGoal?.id !== goalId) return {};
        return {
          activeGoal: {
            ...s.activeGoal,
            milestones: [...(s.activeGoal.milestones ?? []), milestone],
          },
        };
      });
      return milestone;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  updateMilestone: async (workspaceId, goalId, milestoneId, payload) => {
    set({ saving: true, error: null });
    try {
      const { milestone, goalProgress } = await updateMilestoneReq(
        workspaceId, goalId, milestoneId, payload
      );
      set((s) => {
        if (s.activeGoal?.id !== goalId) return {};
        return {
          activeGoal: {
            ...s.activeGoal,
            progress:   goalProgress,
            milestones: (s.activeGoal.milestones ?? []).map((m) =>
              m.id === milestoneId ? milestone : m
            ),
          },
        };
      });
      return milestone;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  deleteMilestone: async (workspaceId, goalId, milestoneId) => {
    set({ saving: true, error: null });
    try {
      await deleteMilestoneReq(workspaceId, goalId, milestoneId);
      set((s) => {
        if (s.activeGoal?.id !== goalId) return {};
        return {
          activeGoal: {
            ...s.activeGoal,
            milestones: (s.activeGoal.milestones ?? []).filter(
              (m) => m.id !== milestoneId
            ),
          },
        };
      });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  // ── Activity + comments ────────────────────────────────────────────────────

  fetchActivity: async (workspaceId, goalId, cursor = null) => {
    set({ loading: true, error: null });
    try {
      const result = await fetchGoalActivity(workspaceId, goalId, cursor ? { cursor } : {});
      set((s) => ({
        activity:   cursor ? [...s.activity, ...result.activities] : result.activities,
        nextCursor: result.nextCursor,
      }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  addComment: async (workspaceId, goalId, content) => {
    set({ saving: true, error: null });
    try {
      const entry = await addCommentReq(workspaceId, goalId, content);
      set((s) => ({ activity: [entry, ...s.activity] }));
      return entry;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  deleteComment: async (workspaceId, goalId, activityId) => {
    set({ saving: true, error: null });
    try {
      await deleteCommentReq(workspaceId, goalId, activityId);
      set((s) => ({ activity: s.activity.filter((a) => a.id !== activityId) }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  // ── Socket mutation helpers ────────────────────────────────────────────────
  // Called by useWorkspaceSocket for events emitted by other users.

  /** New goal broadcast — skip if already present */
  _socketAdd: (goal) => {
    set((s) => {
      if (s.goals.some((g) => g.id === goal.id)) return {};
      return { goals: [goal, ...s.goals], total: s.total + 1 };
    });
  },

  /**
   * Goal updated by another user.
   * Skipped if this goal is in `_pending` (our own HTTP call is in-flight).
   * Updates both the list entry (scalar fields) and the open detail view.
   */
  _socketUpdate: (goal) => {
    if (_pending.has(goal.id)) return;
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goal.id
          // For the list, update only the fields that affect the list card
          ? { ...g, title: goal.title, status: goal.status, priority: goal.priority,
              progress: goal.progress, dueDate: goal.dueDate, owner: goal.owner,
              _count: goal._count ?? g._count }
          : g
      ),
      // For the detail view, merge the full payload
      activeGoal: s.activeGoal?.id === goal.id
        ? { ...s.activeGoal, ...goal }
        : s.activeGoal,
    }));
  },

  /** Goal deleted by another user — always applies */
  _socketDelete: (goalId) => {
    set((s) => ({
      goals:      s.goals.filter((g) => g.id !== goalId),
      total:      Math.max(0, s.total - 1),
      activeGoal: s.activeGoal?.id === goalId ? null : s.activeGoal,
    }));
  },
}));
