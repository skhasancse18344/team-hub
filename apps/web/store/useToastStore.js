"use client";
/**
 * useToastStore — global toast queue
 * ===================================
 * Shared across all stores. Push a toast from anywhere:
 *
 *   import { useToastStore } from "./useToastStore";
 *   useToastStore.getState().push("Failed to update goal", "error", "goal");
 *
 * Render `<ToastRegion />` once at the app root (dashboard layout) to display toasts.
 *
 * API
 * ---
 *   push(message, type?, source?)  — add a toast
 *   dismiss(id)                    — remove one toast
 *   clear()                        — remove all toasts
 *
 * Types:  "error" | "success" | "info"
 * Sources: any string — "task", "goal", "app", etc.
 */
import { create } from "zustand";

let _seq = 0;

function makeToast(message, type = "error", source = "app") {
  return {
    id:      `t_${++_seq}_${Date.now()}`,
    message,
    type,    // "error" | "success" | "info"
    source,  // "task" | "goal" | "app"
  };
}

export const useToastStore = create((set) => ({
  toasts: [],

  /** Push a new toast onto the queue */
  push: (message, type = "error", source = "app") =>
    set((s) => ({ toasts: [...s.toasts, makeToast(message, type, source)] })),

  /** Remove a single toast by id */
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  /** Remove all toasts (e.g. on logout) */
  clear: () => set({ toasts: [] }),
}));
