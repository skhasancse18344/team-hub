import { create } from "zustand";
import { api } from "../lib/api";

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false,

  // Restore session on app mount (reads httpOnly cookie via /api/auth/me)
  initialize: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      const { data } = await api.get("/api/auth/me");
      set({ user: data.user, isAuthenticated: true, loading: false, initialized: true });
    } catch {
      set({ user: null, isAuthenticated: false, loading: false, initialized: true });
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post("/api/auth/register", { name, email, password });
      set({ user: data.user, isAuthenticated: true, loading: false });
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message;
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      set({ user: data.user, isAuthenticated: true, loading: false });
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message;
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    set({ user: null, isAuthenticated: false, initialized: false });
  },

  clearError: () => set({ error: null }),
}));
