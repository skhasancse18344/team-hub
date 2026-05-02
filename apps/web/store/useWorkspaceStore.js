"use client";
import { create } from "zustand";
import {
  fetchWorkspaces,
  createWorkspaceReq,
  fetchWorkspace,
  updateWorkspaceReq,
  deleteWorkspaceReq,
  fetchMembers,
  updateMemberRoleReq,
  removeMemberReq,
  leaveWorkspaceReq,
  fetchInvites,
  inviteMemberReq,
  revokeInviteReq,
  fetchMyInvites,
  acceptInviteReq,
} from "../lib/api";

const ACTIVE_WS_KEY = "th-active-workspace";

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  members: [],
  invites: [],
  myInvites: [],
  loading: false,
  error: null,

  // ── Workspaces ──────────────────────────────────────────────────────────────

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const workspaces = await fetchWorkspaces();
      set({ workspaces });
      // Restore or default the active workspace
      const savedId =
        typeof window !== "undefined"
          ? localStorage.getItem(ACTIVE_WS_KEY)
          : null;
      const active =
        workspaces.find((w) => w.id === savedId) ?? workspaces[0] ?? null;
      set({ activeWorkspace: active });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  createWorkspace: async (payload) => {
    set({ loading: true, error: null });
    try {
      const workspace = await createWorkspaceReq(payload);
      set((s) => ({
        workspaces: [...s.workspaces, workspace],
        activeWorkspace: workspace,
      }));
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_WS_KEY, workspace.id);
      }
      return workspace;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateWorkspace: async (id, payload) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateWorkspaceReq(id, payload);
      set((s) => ({
        workspaces: s.workspaces.map((w) => (w.id === id ? updated : w)),
        activeWorkspace: s.activeWorkspace?.id === id ? updated : s.activeWorkspace,
      }));
      return updated;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteWorkspace: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteWorkspaceReq(id);
      set((s) => {
        const remaining = s.workspaces.filter((w) => w.id !== id);
        const active =
          s.activeWorkspace?.id === id ? (remaining[0] ?? null) : s.activeWorkspace;
        if (typeof window !== "undefined") {
          active
            ? localStorage.setItem(ACTIVE_WS_KEY, active.id)
            : localStorage.removeItem(ACTIVE_WS_KEY);
        }
        return { workspaces: remaining, activeWorkspace: active };
      });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  setActiveWorkspace: (workspace) => {
    set({ activeWorkspace: workspace });
    if (typeof window !== "undefined") {
      workspace
        ? localStorage.setItem(ACTIVE_WS_KEY, workspace.id)
        : localStorage.removeItem(ACTIVE_WS_KEY);
    }
  },

  // ── Members ─────────────────────────────────────────────────────────────────

  fetchMembers: async (workspaceId) => {
    set({ loading: true, error: null });
    try {
      const members = await fetchMembers(workspaceId);
      set({ members });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  updateMemberRole: async (workspaceId, memberId, role) => {
    set({ loading: true, error: null });
    try {
      const updated = await updateMemberRoleReq(workspaceId, memberId, role);
      set((s) => ({
        members: s.members.map((m) => (m.id === memberId ? updated : m)),
      }));
      return updated;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  removeMember: async (workspaceId, memberId) => {
    set({ loading: true, error: null });
    try {
      await removeMemberReq(workspaceId, memberId);
      set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  leaveWorkspace: async (workspaceId) => {
    set({ loading: true, error: null });
    try {
      await leaveWorkspaceReq(workspaceId);
      set((s) => {
        const remaining = s.workspaces.filter((w) => w.id !== workspaceId);
        const active =
          s.activeWorkspace?.id === workspaceId
            ? (remaining[0] ?? null)
            : s.activeWorkspace;
        return { workspaces: remaining, activeWorkspace: active };
      });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  // ── Invites ─────────────────────────────────────────────────────────────────

  fetchInvites: async (workspaceId) => {
    set({ loading: true, error: null });
    try {
      const invites = await fetchInvites(workspaceId);
      set({ invites });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  inviteMember: async (workspaceId, payload) => {
    set({ loading: true, error: null });
    try {
      const invite = await inviteMemberReq(workspaceId, payload);
      set((s) => ({ invites: [...s.invites, invite] }));
      return invite;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  revokeInvite: async (workspaceId, inviteId) => {
    set({ loading: true, error: null });
    try {
      await revokeInviteReq(workspaceId, inviteId);
      set((s) => ({ invites: s.invites.filter((i) => i.id !== inviteId) }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchMyInvites: async () => {
    set({ loading: true, error: null });
    try {
      const myInvites = await fetchMyInvites();
      set({ myInvites });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  acceptInvite: async (token) => {
    set({ loading: true, error: null });
    try {
      const membership = await acceptInviteReq(token);
      // Remove from pending list and add the workspace if we have it
      set((s) => ({
        myInvites: s.myInvites.filter((i) => i.token !== token),
      }));
      // Refresh workspace list so the newly joined one appears
      await get().fetchWorkspaces();
      return membership;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
