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
      // Guard: socket may have already added this item before the HTTP response arrived
      set((s) =>
        s.announcements.some((a) => a.id === ann.id)
          ? {}
          : { announcements: [ann, ...s.announcements], total: s.total + 1 }
      );
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
      // Guard: socket may have already added this comment before HTTP response
      set((s) => {
        const existing = s.comments[annId] ?? [];
        if (existing.some((c) => c.id === comment.id)) return {};
        return {
          comments: {
            ...s.comments,
            [annId]: [...existing, comment],
          },
          // Update comment count on the announcement
          announcements: s.announcements.map((a) =>
            a.id === annId
              ? { ...a, _count: { ...a._count, comments: (a._count?.comments ?? 0) + 1 } }
              : a
          ),
        };
      });
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

  // ── Socket mutation helpers (called by useWorkspaceSocket) ─────────────────

  /** New announcement arrived — prepend if not already present */
  _socketAdd: (announcement) => {
    set((s) => {
      if (s.announcements.some((a) => a.id === announcement.id)) return {};
      const list = [announcement, ...s.announcements].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return { announcements: list, total: s.total + 1 };
    });
  },

  /** Announcement was edited or pinned */
  _socketUpdate: (announcement) => {
    set((s) => {
      const list = s.announcements
        .map((a) => (a.id === announcement.id ? announcement : a))
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      return { announcements: list };
    });
  },

  /** Announcement was deleted */
  _socketDelete: (announcementId) => {
    set((s) => ({
      announcements: s.announcements.filter((a) => a.id !== announcementId),
      total: Math.max(0, s.total - 1),
    }));
  },

  /** Comment added by another user */
  _socketAddComment: (announcementId, comment) => {
    set((s) => {
      const existing = s.comments[announcementId];
      // Only update if we already have the comment list loaded for this announcement
      if (!existing) return {};
      if (existing.some((c) => c.id === comment.id)) return {};
      return {
        comments: { ...s.comments, [announcementId]: [...existing, comment] },
        announcements: s.announcements.map((a) =>
          a.id === announcementId
            ? { ...a, _count: { ...a._count, comments: (a._count?.comments ?? 0) + 1 } }
            : a
        ),
      };
    });
  },

  /** Comment deleted by another user */
  _socketDeleteComment: (announcementId, commentId) => {
    set((s) => {
      const existing = s.comments[announcementId];
      if (!existing) return {};
      return {
        comments: { ...s.comments, [announcementId]: existing.filter((c) => c.id !== commentId) },
        announcements: s.announcements.map((a) =>
          a.id === announcementId
            ? { ...a, _count: { ...a._count, comments: Math.max(0, (a._count?.comments ?? 1) - 1) } }
            : a
        ),
      };
    });
  },

  /** Reactions changed on an announcement */
  _socketReaction: (announcementId, reactions) => {
    set((s) => ({
      announcements: s.announcements.map((a) =>
        a.id === announcementId ? { ...a, reactions } : a
      ),
    }));
  },
}));
