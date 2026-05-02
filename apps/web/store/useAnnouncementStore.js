"use client";
import { create } from "zustand";
import {
  fetchAnnouncements,
  createAnnouncementReq,
  updateAnnouncementReq,
  deleteAnnouncementReq,
  pinAnnouncementReq,
  toggleReactionReq,
  fetchAnnouncementComments,
  addAnnouncementCommentReq,
  deleteAnnouncementCommentReq,
} from "../lib/api";

export const useAnnouncementStore = create((set, get) => ({
  announcements: [],
  total:         0,
  loading:       false,
  saving:        false,
  error:         null,
  // Per-announcement comment state: { [annId]: Comment[] }
  comments:      {},
  commentsLoading: {},

  // ── Announcements ──────────────────────────────────────────────────────────

  fetchAnnouncements: async (workspaceId, params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await fetchAnnouncements(workspaceId, params);
      set({ announcements: data.announcements, total: data.total });
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
    } finally {
      set({ loading: false });
    }
  },

  createAnnouncement: async (workspaceId, payload) => {
    set({ saving: true, error: null });
    try {
      const ann = await createAnnouncementReq(workspaceId, payload);
      set((s) => ({ announcements: [ann, ...s.announcements], total: s.total + 1 }));
      return ann;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  updateAnnouncement: async (workspaceId, annId, payload) => {
    set({ saving: true, error: null });
    try {
      const updated = await updateAnnouncementReq(workspaceId, annId, payload);
      set((s) => ({
        announcements: s.announcements.map((a) => (a.id === annId ? updated : a)),
      }));
      return updated;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  deleteAnnouncement: async (workspaceId, annId) => {
    set({ saving: true, error: null });
    try {
      await deleteAnnouncementReq(workspaceId, annId);
      set((s) => ({
        announcements: s.announcements.filter((a) => a.id !== annId),
        total: Math.max(0, s.total - 1),
      }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  pinAnnouncement: async (workspaceId, annId) => {
    try {
      const updated = await pinAnnouncementReq(workspaceId, annId);
      // Re-sort: pinned items float to top
      set((s) => {
        const updated_list = s.announcements
          .map((a) => (a.id === annId ? updated : a))
          .sort((a, b) => {
            if (a.isPinned === b.isPinned) {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return a.isPinned ? -1 : 1;
          });
        return { announcements: updated_list };
      });
      return updated;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    }
  },

  toggleReaction: async (workspaceId, annId, emoji) => {
    try {
      const reactions = await toggleReactionReq(workspaceId, annId, emoji);
      set((s) => ({
        announcements: s.announcements.map((a) =>
          a.id === annId ? { ...a, reactions } : a
        ),
      }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    }
  },

  // ── Comments ───────────────────────────────────────────────────────────────

  fetchComments: async (workspaceId, annId) => {
    set((s) => ({ commentsLoading: { ...s.commentsLoading, [annId]: true } }));
    try {
      const comments = await fetchAnnouncementComments(workspaceId, annId);
      set((s) => ({
        comments: { ...s.comments, [annId]: comments },
        commentsLoading: { ...s.commentsLoading, [annId]: false },
      }));
    } catch {
      set((s) => ({ commentsLoading: { ...s.commentsLoading, [annId]: false } }));
    }
  },

  addComment: async (workspaceId, annId, content) => {
    set({ saving: true });
    try {
      const comment = await addAnnouncementCommentReq(workspaceId, annId, content);
      set((s) => ({
        comments: {
          ...s.comments,
          [annId]: [...(s.comments[annId] ?? []), comment],
        },
        // Update comment count on the announcement
        announcements: s.announcements.map((a) =>
          a.id === annId
            ? { ...a, _count: { ...a._count, comments: (a._count?.comments ?? 0) + 1 } }
            : a
        ),
      }));
      return comment;
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  deleteComment: async (workspaceId, annId, commentId) => {
    try {
      await deleteAnnouncementCommentReq(workspaceId, annId, commentId);
      set((s) => ({
        comments: {
          ...s.comments,
          [annId]: (s.comments[annId] ?? []).filter((c) => c.id !== commentId),
        },
        announcements: s.announcements.map((a) =>
          a.id === annId
            ? { ...a, _count: { ...a._count, comments: Math.max(0, (a._count?.comments ?? 1) - 1) } }
            : a
        ),
      }));
    } catch (err) {
      set({ error: err?.response?.data?.error ?? err.message });
      throw err;
    }
  },
}));
