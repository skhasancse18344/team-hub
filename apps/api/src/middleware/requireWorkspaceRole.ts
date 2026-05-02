import { Request, Response, NextFunction } from "express";
import { Role } from "../../generated/prisma/client";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";

export const ROLE_RANK: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

/**
 * Middleware that verifies the authenticated user is a member of the workspace
 * (resolved from req.params.id or req.params.workspaceId) with at least
 * the given minimum role. Attaches req.membership on success.
 */
export function requireWorkspaceRole(minRole: Role) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId      = req.user!.id;
      const workspaceId = (req.params.id ?? req.params.workspaceId) as string;

      if (!workspaceId) {
        throw new AppError(400, "workspaceId is required");
      }

      const membership = await db.membership.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      });

      if (!membership) {
        throw new AppError(403, "You are not a member of this workspace");
      }

      if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
        throw new AppError(403, `Requires ${minRole} role or higher`);
      }

      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}
