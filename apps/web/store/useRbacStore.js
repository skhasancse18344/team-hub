"use client";
/**
 * useRbacStore
 * ============
 * Global Zustand store for the current user's workspace role and permissions.
 *
 * Lifecycle
 * ---------
 *   1. `loadPermissions(workspaceId)` — called once per workspace switch.
 *      Results are cached in `cache` (module-level Map) so the API is only hit
 *      once per workspaceId per browser session.
 *   2. `can(permission)` — synchronous boolean check against the loaded set.
 *   3. `reset()` — called on logout.
 *   4. `invalidate(workspaceId?)` — clear cache entry (or entire cache) so the
 *      next `loadPermissions` call does a fresh network request.
 *
 * Usage in a component
 * --------------------
 *   const { can, role, loading } = useRbacStore();
 *
 *   // In a useEffect or layout:
 *   const { loadPermissions } = useRbacStore();
 *   useEffect(() => { loadPermissions(workspace.id); }, [workspace.id]);
 *
 *   // Conditional render:
 *   {can("tasks:create")       && <button>New task</button>}
 *   {can("invites:send")       && <InviteModal />}
 *   {can("announcements:create") && <button>Announce</button>}
 *   {can("members:manage")     && <ManageRoleBtn />}
 */
import { create } from "zustand";
import { fetchMyPermissions } from "../lib/api";

// ── Module-level permission cache ─────────────────────────────────────────────
// Persists across re-renders/navigations; keyed by workspaceId.
const cache = new Map();

export const useRbacStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  workspaceId: null,
  role:        null,        // "OWNER" | "ADMIN" | "MEMBER" | null
  permissions: [],          // string[] — all PermissionKey values granted to this role
  loading:     false,
  error:       null,

  // ── can(permission) ───────────────────────────────────────────────────────
  // Primary public API. Always synchronous — returns false while loading.
  can: (permission) => get().permissions.includes(permission),

  // ── hasRole(minRole) ─────────────────────────────────────────────────────
  // Convenience rank check. Mirrors backend ROLE_RANK logic.
  hasRole: (minRole) => {
    const RANK = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
    const userRank = RANK[get().role] ?? 0;
    return userRank >= (RANK[minRole] ?? 0);
  },

  // ── loadPermissions(workspaceId) ──────────────────────────────────────────
  // Call once per workspace switch. Deduplicates via the module-level cache.
  loadPermissions: async (workspaceId) => {
    if (!workspaceId) return;

    // Already loaded for this workspace — apply from cache and return early
    if (cache.has(workspaceId)) {
      const hit = cache.get(workspaceId);
      set({ workspaceId, role: hit.role, permissions: hit.permissions, loading: false, error: null });
      return;
    }

    // In-flight guard: don't fire duplicate requests
    if (get().loading && get().workspaceId === workspaceId) return;

    set({ loading: true, error: null, workspaceId });
    try {
      const { role, permissions } = await fetchMyPermissions(workspaceId);
      cache.set(workspaceId, { role, permissions });
      set({ role, permissions, loading: false });
    } catch (err) {
      const msg = err?.response?.data?.error ?? err.message ?? "Failed to load permissions";
      set({ loading: false, error: msg });
    }
  },

  // ── invalidate(workspaceId?) ──────────────────────────────────────────────
  // Clears one entry or the entire cache. The next loadPermissions() call will
  // re-fetch from the server. Useful after role changes.
  invalidate: (workspaceId) => {
    if (workspaceId) cache.delete(workspaceId);
    else             cache.clear();
  },

  // ── reset() ──────────────────────────────────────────────────────────────
  // Called on logout / workspace leave.
  reset: () => {
    cache.clear();
    set({ workspaceId: null, role: null, permissions: [], loading: false, error: null });
  },
}));
