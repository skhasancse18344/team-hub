"use client";
/**
 * usePermissions(workspaceId)
 * ───────────────────────────
 * Fetches the current user's permission set for a workspace and exposes:
 *   - `can(permission)` — boolean check
 *   - `role`            — "OWNER" | "ADMIN" | "MEMBER" | null
 *   - `permissions`     — raw string[] from the API
 *   - `loading`         — true while the first fetch is in-flight
 *
 * Results are cached in a module-level map so the API is called at most once
 * per workspaceId per page load.
 *
 * Usage:
 *   const { can } = usePermissions(activeWorkspace?.id);
 *
 *   // Conditionally show a button
 *   {can("announcements:create") && <button>New Announcement</button>}
 *
 *   // Guard an action
 *   if (!can("invites:send")) return;
 */
import { useState, useEffect } from "react";
import { fetchMyPermissions } from "./api";

// Module-level cache — survives re-renders, cleared on page navigation
const cache = new Map();

export function usePermissions(workspaceId) {
  const cached = workspaceId ? cache.get(workspaceId) : null;

  const [state, setState] = useState({
    role:        cached?.role        ?? null,
    permissions: cached?.permissions ?? [],
    loading:     !cached && Boolean(workspaceId),
  });

  useEffect(() => {
    if (!workspaceId) return;
    if (cache.has(workspaceId)) {
      const hit = cache.get(workspaceId);
      setState({ role: hit.role, permissions: hit.permissions, loading: false });
      return;
    }

    let cancelled = false;
    fetchMyPermissions(workspaceId)
      .then((data) => {
        if (cancelled) return;
        cache.set(workspaceId, data);
        setState({ role: data.role, permissions: data.permissions, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });

    return () => { cancelled = true; };
  }, [workspaceId]);

  function can(permission) {
    return state.permissions.includes(permission);
  }

  return { ...state, can };
}

/** Call this when switching workspaces to force a fresh fetch */
export function invalidatePermissionsCache(workspaceId) {
  if (workspaceId) cache.delete(workspaceId);
  else             cache.clear();
}
