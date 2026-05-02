"use client";
/**
 * Auth layout — wraps /login and /signup.
 * Redirects already-authenticated users straight to /dashboard
 * so they never see the auth forms again.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";

export default function AuthLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, initialized, initialize } = useAuthStore();

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (initialized && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [initialized, isAuthenticated, router]);

  return <>{children}</>;
}

