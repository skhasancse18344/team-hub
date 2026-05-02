import { Request, Response, NextFunction } from "express";
import { PERMISSIONS, PermissionKey } from "../config/permissions";
import { requireWorkspaceRole } from "./requireWorkspaceRole";

/**
 * requirePermission(permission)
 * ─────────────────────────────
 * Permission-name–based route guard. Looks up the minimum role for the given
 * permission key in the central PERMISSIONS map and delegates to
 * requireWorkspaceRole.
 *
 * Benefits over `requireWorkspaceRole("ADMIN")` directly:
 *   • Routes express *intent*, not a role name ("announcements:create" vs "ADMIN")
 *   • Adding/changing role requirements only touches `config/permissions.ts`
 *   • Easy to unit-test the permission map independently of Express
 *
 * Usage:
 *   router.post("/", requirePermission("announcements:create"), handler);
 *   router.delete("/:id", requirePermission("workspace:delete"), handler);
 */
export function requirePermission(permission: PermissionKey) {
  const minRole = PERMISSIONS[permission];
  // Delegate entirely to requireWorkspaceRole so all membership lookup,
  // req.membership attachment and error handling live in one place.
  return requireWorkspaceRole(minRole);
}
