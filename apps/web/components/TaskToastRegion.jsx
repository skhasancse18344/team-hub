"use client";
/**
 * ToastRegion
 * ===========
 * Renders global rollback / error toasts from `useToastStore`.
 * Mount once in the dashboard layout — covers all pages.
 *
 * Toasts pushed by any store (task, goal, or app-level) appear here.
 * Each toast auto-dismisses after DISMISS_MS milliseconds.
 */
import { useEffect } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToastStore } from "../store/useToastStore";
import styles from "./TaskToastRegion.module.css";

const DISMISS_MS = 4500;

export default function ToastRegion() {
  const toasts  = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  // Auto-dismiss the oldest toast after DISMISS_MS
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => dismiss(toasts[0].id), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.type === "error" ? styles.error : styles.success}`}
        >
          <span className={styles.icon}>
            {toast.type === "error"
              ? <AlertTriangle size={15} />
              : <CheckCircle2 size={15} />}
          </span>
          <span className={styles.message}>{toast.message}</span>
          <button
            className={styles.close}
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
