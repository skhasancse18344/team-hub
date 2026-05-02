import { Request, Response, NextFunction } from "express";
import { Role } from "../../generated/prisma/client";
import { PERMISSIONS, PermissionKey } from "../config/permissions";
import { ROLE_RANK } from "../middleware/requireWorkspaceRole";
import { AppError } from "./AppError";

// ── hasPermission ──────────────────────────────────────────────────────────────
/**
 * Pure function — no DB call. Checks whether `role` meets the minimum rank
 * for `permission`. Use inside controllers for conditional logic.
 *
 * Example:
 *   if (hasPermission(req.membership!.role, "announcements:delete_any")) {
 *     // allow deleting any announcement
 *   } else if (announcement.authorId !== userId) {
 *     throw new AppError(403, "You can only delete your own announcements");
 *   }
 */
export function hasPermission(role: Role, permission: PermissionKey): boolean {
  const minRole = PERMISSIONS[permission];
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

// ── assertPermission ───────────────────────────────────────────────────────────
/**
 * Throws AppError(403) if the role does not satisfy the permission.
 * Use inside controllers after req.membership is already attached.
 *
 * Example:
 *   assertPermission(req.membership!.role, "workspace:update");
 */
export function assertPermission(role: Role, permission: PermissionKey): void {
  if (!hasPermission(role, permission)) {
    throw new AppError(403, `Missing permission: ${permission}`);
  }
}

// ── requireOwnership ──────────────────────────────────────────────────────────
/**
 * Route middleware factory for resource-level ownership checks.
 *
 * Allows the request through if EITHER:
 *   (a) the authenticated user owns the resource (getOwnerId returns userId), OR
 *   (b) the user has at least `bypassRole` in the workspace (default "ADMIN")
 *
 * Must be used AFTER `requireWorkspaceRole` (or `requirePermission`) so that
 * req.membership is already attached.
 *
 * @param getOwnerId  async fn that resolves the resource owner's userId from
 *                    req. Return null/undefined to force a 404 before the
 *                    ownership check.
 * @param bypassRole  minimum workspace role that may skip the ownership check.
 *                    Defaults to "ADMIN".
 *
 * Example — only the comment author or an ADMIN may delete a comment:
 *
 *   router.delete(
 *     "/:annId/comments/:commentId",
 *     requirePermission("comments:create"),     // ensures member of workspace
 *     requireOwnership(
 *       async (req) => {
 *         const c = await db.comment.findUnique({ where: { id: req.params.commentId as string } });
 *         if (!c) throw new AppError(404, "Comment not found");
 *         return c.userId;
 *       },
 *       "ADMIN"
 *     ),
 *     deleteComment
 *   );
 */
export function requireOwnership(
  getOwnerId: (req: Request) => Promise<string | null | undefined>,
  bypassRole: Role = "ADMIN"
) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId         = req.user!.id;
      const membershipRole = req.membership?.role;

      // If membership is missing, requireWorkspaceRole wasn't run first — fail safe.
      if (!membershipRole) {
        throw new AppError(403, "Membership context required");
      }

      // ADMIN+ always bypasses ownership
      if (ROLE_RANK[membershipRole] >= ROLE_RANK[bypassRole]) {
        return next();
      }

      // Otherwise verify ownership
      const ownerId = await getOwnerId(req);
      if (ownerId == null) {
        throw new AppError(404, "Resource not found");
      }
      if (ownerId !== userId) {
        throw new AppError(403, "You do not have permission to modify this resource");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ── getUserPermissions ─────────────────────────────────────────────────────────
/**
 * Returns the full set of permission keys granted to a given role.
 * Used by the `GET /api/workspaces/:id/my-permissions` endpoint to
 * let the frontend conditionally show/hide UI controls.
 */
export function getUserPermissions(role: Role): PermissionKey[] {
  return (Object.entries(PERMISSIONS) as [PermissionKey, Role][])
    .filter(([, minRole]) => ROLE_RANK[role] >= ROLE_RANK[minRole])
    .map(([key]) => key);
}
