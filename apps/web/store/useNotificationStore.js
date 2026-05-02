"use client";
import { create } from "zustand";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationReq,
  clearAllNotificationsReq,
} from "../lib/api";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  total:         0,
  loading:       false,
  initialized:   false,

  // ── Fetch (called on mount, loads first page) ────────────────────────────────
  fetchNotifications: async (params = {}) => {
    set({ loading: true });
    try {
      const data = await fetchNotifications({ limit: 30, ...params });
      set({
        notifications: data.notifications,
        unreadCount:   data.unreadCount,
        total:         data.total,
        initialized:   true,
      });
    } catch {
      // Silently fail — non-critical
    } finally {
      set({ loading: false });
    }
  },

  // ── Mark single read ─────────────────────────────────────────────────────────
  markRead: async (id) => {
    const notif = get().notifications.find((n) => n.id === id);
    if (!notif || notif.isRead) return;

    // Optimistic
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
      unreadCount:   Math.max(0, s.unreadCount - 1),
    }));
    try {
      await markNotificationRead(id);
    } catch {
      // Revert on failure
      set((s) => ({
        notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: false } : n),
        unreadCount:   s.unreadCount + 1,
      }));
    }
  },

  // ── Mark all read ────────────────────────────────────────────────────────────
  markAllRead: async () => {
    const prev = get().notifications;
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
    try {
      await markAllNotificationsRead();
    } catch {
      set({ notifications: prev });
    }
  },

  // ── Delete single ────────────────────────────────────────────────────────────
  deleteNotification: async (id) => {
    const notif = get().notifications.find((n) => n.id === id);
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      total:         Math.max(0, s.total - 1),
      unreadCount:   notif && !notif.isRead ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
    }));
    try {
      await deleteNotificationReq(id);
    } catch {
      // Best-effort — don't bother reverting
    }
  },

  // ── Clear all ────────────────────────────────────────────────────────────────
  clearAll: async () => {
    set({ notifications: [], unreadCount: 0, total: 0 });
    try {
      await clearAllNotificationsReq();
    } catch {
      // Best-effort
    }
  },

  // ── Socket push handler ──────────────────────────────────────────────────────
  _socketPush: (notification) => {
    set((s) => {
      if (s.notifications.some((n) => n.id === notification.id)) return {};
      return {
        notifications: [notification, ...s.notifications],
        unreadCount:   s.unreadCount + 1,
        total:         s.total + 1,
      };
    });
  },
}));
