"use client";
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

export const useGoalStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  goals:       [],
  total:       0,
  activeGoal:  null,
  activity:    [],     // current goal's activity feed
  nextCursor:  null,
  filters:     { status: "", priority: "" },
  loading:     false,
  saving:      false,
  error:       null,

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),

  // ── Goals ──────────────────────────────────────────────────────────────────

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

  createGoal: async (workspaceId, payload) => {
    set({ saving: true, error: null });
    try {
      const goal = await createGoalReq(workspaceId, payload);
      set((s) => ({ goals: [goal, ...s.goals], total: s.total + 1 }));
      return goal;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

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

  updateGoal: async (workspaceId, goalId, payload) => {
    set({ saving: true, error: null });
    try {
      const updated = await updateGoalReq(workspaceId, goalId, payload);
      set((s) => ({
        goals:      s.goals.map((g) => (g.id === goalId ? updated : g)),
        activeGoal: s.activeGoal?.id === goalId ? updated : s.activeGoal,
      }));
      return updated;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  deleteGoal: async (workspaceId, goalId) => {
    set({ loading: true, error: null });
    try {
      await deleteGoalReq(workspaceId, goalId);
      set((s) => ({
        goals:      s.goals.filter((g) => g.id !== goalId),
        total:      s.total - 1,
        activeGoal: s.activeGoal?.id === goalId ? null : s.activeGoal,
      }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // ── Milestones ─────────────────────────────────────────────────────────────

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
      // Prepend since feed is newest-first
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
      set((s) => ({
        activity: s.activity.filter((a) => a.id !== activityId),
      }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },
}));
