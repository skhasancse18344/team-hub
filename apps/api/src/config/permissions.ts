/**
 * RBAC Permission Registry
 * ========================
 * Single source of truth for every named permission in the application.
 *
 * Structure
 * ---------
 *   "<resource>:<action>" → minimum Role required
 *
 * Adding a new role (e.g. MODERATOR)
 * -----------------------------------
 * 1. Add the role to the Prisma `Role` enum + run a migration.
 * 2. Add `MODERATOR` to `ROLE_RANK` in requireWorkspaceRole.ts.
 * 3. Update only the entries below that the new role should gain access to.
 *    Zero route files need to change.
 *
 * Consuming in routes
 * -------------------
 *   import { requirePermission } from "../middleware/requirePermission";
 *   router.post("/", requirePermission("announcements:create"), handler);
 *
 * Consuming in controllers (conditional logic)
 * ---------------------------------------------
 *   import { hasPermission } from "../utils/rbac";
 *   if (hasPermission(req.membership!.role, "announcements:delete_any")) { ... }
 *
 * Exposing to the frontend
 * ------------------------
 *   GET /api/workspaces/:id/my-permissions  → returns the user's permission set
 *   (see workspace.controller → getMyPermissions)
 */

import { Role } from "../../generated/prisma/client";

// ── Permission key type ────────────────────────────────────────────────────────
export type PermissionKey =
  // Workspace
  | "workspace:view"
  | "workspace:update"
  | "workspace:delete"
  // Members
  | "members:view"
  | "members:manage"        // update role, remove
  // Invites
  | "invites:view"
  | "invites:send"
  | "invites:revoke"
  // Announcements
  | "announcements:view"
  | "announcements:create"
  | "announcements:update_any"   // edit any announcement (own handled in controller)
  | "announcements:delete_any"
  | "announcements:pin"
  // Goals
  | "goals:view"
  | "goals:create"
  | "goals:update"
  | "goals:delete_any"           // delete any goal (own handled in controller)
  // Milestones
  | "milestones:manage"
  // Tasks
  | "tasks:view"
  | "tasks:create"
  | "tasks:update"
  | "tasks:delete_any"
  // Analytics
  | "analytics:view"
  | "analytics:export"
  // Comments / reactions
  | "comments:create"
  | "comments:delete_any"
  | "reactions:toggle";

// ── Permission → minimum required role ────────────────────────────────────────
// Any member whose ROLE_RANK >= this role's rank is granted the permission.
export const PERMISSIONS: Record<PermissionKey, Role> = {
  // Workspace ──────────────────────────────────────────────────────────────────
  "workspace:view":           "MEMBER",
  "workspace:update":         "ADMIN",
  "workspace:delete":         "OWNER",

  // Members ────────────────────────────────────────────────────────────────────
  "members:view":             "MEMBER",
  "members:manage":           "ADMIN",

  // Invites ────────────────────────────────────────────────────────────────────
  "invites:view":             "ADMIN",
  "invites:send":             "ADMIN",
  "invites:revoke":           "ADMIN",

  // Announcements ──────────────────────────────────────────────────────────────
  "announcements:view":       "MEMBER",
  "announcements:create":     "ADMIN",
  "announcements:update_any": "ADMIN",
  "announcements:delete_any": "ADMIN",
  "announcements:pin":        "ADMIN",

  // Goals ──────────────────────────────────────────────────────────────────────
  "goals:view":               "MEMBER",
  "goals:create":             "MEMBER",
  "goals:update":             "MEMBER",
  "goals:delete_any":         "ADMIN",

  // Milestones ─────────────────────────────────────────────────────────────────
  "milestones:manage":        "MEMBER",

  // Tasks ──────────────────────────────────────────────────────────────────────
  "tasks:view":               "MEMBER",
  "tasks:create":             "MEMBER",
  "tasks:update":             "MEMBER",
  "tasks:delete_any":         "MEMBER",

  // Analytics ──────────────────────────────────────────────────────────────────
  "analytics:view":           "MEMBER",
  "analytics:export":         "MEMBER",

  // Comments / reactions ───────────────────────────────────────────────────────
  "comments:create":          "MEMBER",
  "comments:delete_any":      "ADMIN",
  "reactions:toggle":         "MEMBER",
};
