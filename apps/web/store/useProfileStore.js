import { create } from "zustand";
import {
  fetchProfile,
  updateProfile as apiUpdateProfile,
  fetchUploadSignature,
  uploadToCloudinary,
  confirmAvatar,
  removeAvatar as apiRemoveAvatar,
} from "../lib/api";

export const useProfileStore = create((set, get) => ({
  user: null,
  loading: false,
  uploading: false,
  error: null,

  // ─── Load profile ─────────────────────────────────────────────────────────
  loadProfile: async () => {
    set({ loading: true, error: null });
    try {
      const user = await fetchProfile();
      set({ user, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error ?? err.message, loading: false });
    }
  },

  // ─── Update name ──────────────────────────────────────────────────────────
  updateProfile: async (payload) => {
    set({ loading: true, error: null });
    try {
      const user = await apiUpdateProfile(payload);
      set({ user, loading: false });
      return user;
    } catch (err) {
      set({ error: err.response?.data?.error ?? err.message, loading: false });
      throw err;
    }
  },

  // ─── Upload avatar (3-step: sign → Cloudinary → confirm) ─────────────────
  uploadAvatar: async (file) => {
    set({ uploading: true, error: null });
    try {
      const signatureData = await fetchUploadSignature();
      const secureUrl = await uploadToCloudinary(file, signatureData);
      const user = await confirmAvatar(secureUrl);
      set({ user, uploading: false });
      return user;
    } catch (err) {
      set({
        error: err.response?.data?.error ?? err.message,
        uploading: false,
      });
      throw err;
    }
  },

  // ─── Remove avatar ────────────────────────────────────────────────────────
  removeAvatar: async () => {
    set({ loading: true, error: null });
    try {
      const user = await apiRemoveAvatar();
      set({ user, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error ?? err.message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
