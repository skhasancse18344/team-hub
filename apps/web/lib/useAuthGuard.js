"use client";
/**
 * useAuthGuard
 *
 * Drop-in hook for any client component that must be behind auth.
 * It calls initialize() once, then redirects to `redirectTo` if the
 * user is not authenticated after initialization completes.
 *
 * Usage:
 *   const { user, initialized, isAuthenticated } = useAuthGuard();
 *   if (!initialized) return <Spinner />;
 *
 * The dashboard layout already handles this inline — this hook is for
 * standalone pages or nested layouts that need independent auth protection.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/useAuthStore";

export function useAuthGuard({ redirectTo = "/login" } = {}) {
  const router = useRouter();
  const { user, isAuthenticated, initialized, loading, initialize } = useAuthStore();

  // Boot auth state once (idempotent — store guards against double calls)
  useEffect(() => { initialize(); }, [initialize]);

  // Redirect as soon as we know the session is absent
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [initialized, isAuthenticated, redirectTo, router]);

  return { user, initialized, isAuthenticated, loading };
}
