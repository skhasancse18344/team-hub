"use client";
import { create } from "zustand";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const EMPTY_USERS = [];

// Lazy import to avoid circular deps — loaded on first socket connect
let _notifPush = null;
function getNotifPush() {
  if (!_notifPush) {
    // Dynamic require — safe in client-only context
    const { useNotificationStore } = require("./useNotificationStore");
    _notifPush = (n) => useNotificationStore.getState()._socketPush(n);
  }
  return _notifPush;
}

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  // workspaceId → OnlineUser[]
  onlineUsers: {},

  // ── Connect (called once after login / on app init) ──────────────────────────
  connect: () => {
    const { socket: existing } = get();
    if (existing?.connected) return;
    if (existing) existing.disconnect();

    const socket = io(API_URL, {
      withCredentials: true, // sends httpOnly access_token cookie
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      set({ connected: true });
    });

    socket.on("disconnect", () => {
      set({ connected: false });
    });

    socket.on("connect_error", (err) => {
      console.warn("[socket] connect error:", err.message);
      set({ connected: false });
    });

    socket.on("online_users", ({ workspaceId, users }) => {
      set((s) => ({
        onlineUsers: { ...s.onlineUsers, [workspaceId]: users },
      }));
    });

    socket.on("notification", (notification) => {
      getNotifPush()(notification);
    });

    set({ socket });
  },

  // ── Disconnect (called on logout) ────────────────────────────────────────────
  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, connected: false, onlineUsers: {} });
  },

  // ── Workspace room management ────────────────────────────────────────────────
  joinWorkspace: (workspaceId) => {
    get().socket?.emit("join_workspace", workspaceId);
  },

  leaveWorkspace: (workspaceId) => {
    get().socket?.emit("leave_workspace", workspaceId);
    set((s) => {
      const { [workspaceId]: _, ...rest } = s.onlineUsers;
      return { onlineUsers: rest };
    });
  },

  // ── Selectors ────────────────────────────────────────────────────────────────
  getWorkspaceOnlineUsers: (workspaceId) => {
    return get().onlineUsers[workspaceId] ?? EMPTY_USERS;
  },
}));
