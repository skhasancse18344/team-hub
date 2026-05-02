import { Request, Response, NextFunction } from "express";
import { Role } from "../../generated/prisma/client";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";
import { ROLE_RANK } from "../middleware/requireWorkspaceRole";
import { getUserPermissions } from "../utils/rbac";

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

const SAFE_MEMBER_SELECT = {
  id: true,
  userId: true,
  workspaceId: true,
  role: true,
  joinedAt: true,
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
} as const;

// ── Workspaces ────────────────────────────────────────────────────────────────

/** POST /api/workspaces — create workspace, creator becomes OWNER */
export async function createWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, description, color } = req.body as {
      name?: string;
      description?: string;
      color?: string;
    };

    if (!name?.trim()) throw new AppError(400, "name is required");

    // Unique slug
    let slug = generateSlug(name);
    let attempts = 0;
    while (await db.workspace.findUnique({ where: { slug } })) {
      slug = generateSlug(name);
      if (++attempts > 10) throw new AppError(500, "Could not generate unique slug");
    }

    const workspace = await db.workspace.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() ?? null,
        color: color ?? null,
        memberships: {
          create: { userId, role: Role.OWNER },
        },
      },
      include: { memberships: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } } },
    });

    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
}

/** GET /api/workspaces — list workspaces the user belongs to */
export async function getMyWorkspaces(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const memberships = await db.membership.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: { select: { memberships: true, goals: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
}

/** GET /api/workspaces/:id — get a single workspace (member+ required via middleware) */
export async function getWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspace = await db.workspace.findUnique({
      where: { id: req.params.id as string },
      include: {
        _count: { select: { memberships: true, goals: true } },
      },
    });

    if (!workspace) throw new AppError(404, "Workspace not found");

    res.json({ workspace, role: req.membership!.role });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/workspaces/:id — update workspace (ADMIN+ required via middleware) */
export async function updateWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, description, color } = req.body as {
      name?: string;
      description?: string;
      color?: string;
    };

    const data: Record<string, unknown> = {};
    if (name !== undefined)        data.name        = name.trim();
    if (description !== undefined) data.description = description.trim() || null;
    if (color !== undefined)       data.color       = color || null;

    if (Object.keys(data).length === 0) {
      throw new AppError(400, "No fields to update");
    }

    const workspace = await db.workspace.update({
      where: { id: req.params.id as string },
      data,
    });

    res.json({ workspace });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/workspaces/:id — delete workspace (OWNER only via middleware) */
export async function deleteWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await db.workspace.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── Members ───────────────────────────────────────────────────────────────────

/** GET /api/workspaces/:id/members */
export async function getMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const members = await db.membership.findMany({
      where: { workspaceId: req.params.id as string },
      select: SAFE_MEMBER_SELECT,
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    res.json({ members });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/workspaces/:id/members/:memberId — change member role */
export async function updateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requestorMembership = req.membership!;
    const targetMembershipId  = req.params.memberId as string;
    const { role } = req.body as { role?: Role };

    if (!role || !["OWNER", "ADMIN", "MEMBER"].includes(role)) {
      throw new AppError(400, "role must be OWNER, ADMIN or MEMBER");
    }

    const target = await db.membership.findUnique({
      where: { id: targetMembershipId as string },
    });

    if (!target || target.workspaceId !== req.params.id) {
      throw new AppError(404, "Member not found");
    }

    // Cannot modify own role
    if (target.userId === requestorMembership.userId) {
      throw new AppError(400, "You cannot change your own role");
    }

    // Cannot promote to a role higher than your own
    if (ROLE_RANK[role] > ROLE_RANK[requestorMembership.role]) {
      throw new AppError(403, "Cannot assign a role higher than your own");
    }

    // Admins cannot touch owners
    if (target.role === Role.OWNER && requestorMembership.role !== Role.OWNER) {
      throw new AppError(403, "Only the OWNER can modify another OWNER's role");
    }

    // Protect last OWNER
    if (target.role === Role.OWNER && role !== Role.OWNER) {
      const ownerCount = await db.membership.count({
        where: { workspaceId: req.params.id as string, role: Role.OWNER },
      });
      if (ownerCount <= 1) {
        throw new AppError(400, "Cannot remove the last owner");
      }
    }

    const updated = await db.membership.update({
      where: { id: targetMembershipId as string },
      data: { role },
      select: SAFE_MEMBER_SELECT,
    });

    res.json({ member: updated });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/workspaces/:id/members/:memberId — remove a member */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const requestorMembership = req.membership!;
    const targetMembershipId  = req.params.memberId as string;

    const target = await db.membership.findUnique({
      where: { id: targetMembershipId as string },
    });

    if (!target || target.workspaceId !== (req.params.id as string)) {
      throw new AppError(404, "Member not found");
    }

    // Requestor cannot remove themselves here (use leaveWorkspace instead)
    if (target.userId === requestorMembership.userId) {
      throw new AppError(400, "Use the leave endpoint to remove yourself");
    }

    // Admins cannot remove Owners
    if (target.role === Role.OWNER && requestorMembership.role !== Role.OWNER) {
      throw new AppError(403, "Only an OWNER can remove another OWNER");
    }

    await db.membership.delete({ where: { id: targetMembershipId as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/workspaces/:id/leave — leave workspace */
export async function leaveWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const membership = req.membership!;

    if (membership.role === Role.OWNER) {
      const ownerCount = await db.membership.count({
        where: { workspaceId: req.params.id as string, role: Role.OWNER },
      });
      if (ownerCount <= 1) {
        throw new AppError(
          400,
          "Transfer ownership before leaving — you are the only owner"
        );
      }
    }

    await db.membership.delete({ where: { id: membership.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── Invites ───────────────────────────────────────────────────────────────────

const INVITE_TTL_DAYS = 7;

/** POST /api/workspaces/:id/invites — invite a user by email */
export async function inviteMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const invitedById = req.user!.id;
    const { email, role = "MEMBER" } = req.body as { email?: string; role?: string };

    if (!email?.trim()) throw new AppError(400, "email is required");
    if (!["ADMIN", "MEMBER"].includes(role)) {
      throw new AppError(400, "role must be ADMIN or MEMBER");
    }

    // Cannot invite an existing member
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      const alreadyMember = await db.membership.findUnique({
        where: { userId_workspaceId: { userId: existing.id as string, workspaceId: workspaceId as string } },
      });
      if (alreadyMember) throw new AppError(409, "User is already a member");
    }

    // Cancel any existing PENDING invite for this email+workspace
    await db.workspaceInvite.updateMany({
      where: { workspaceId, email, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    const invite = await db.workspaceInvite.create({
      data: {
        workspaceId,
        invitedById,
        email: email.trim().toLowerCase(),
        role: role as Role,
        expiresAt,
      },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    });

    // TODO: send invite email (placeholder — log the token for now)
    console.info(`[INVITE] token=${invite.token} email=${email} workspace=${workspaceId}`);

    res.status(201).json({ invite });
  } catch (err) {
    next(err);
  }
}

/** GET /api/workspaces/:id/invites — list pending invites for a workspace */
export async function getInvites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const invites = await db.workspaceInvite.findMany({
      where: { workspaceId: req.params.id as string, status: "PENDING" },
      include: { invitedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ invites });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/workspaces/:id/invites/:inviteId — revoke an invite */
export async function revokeInvite(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const invite = await db.workspaceInvite.findUnique({
      where: { id: req.params.inviteId as string },
    });

    if (!invite || invite.workspaceId !== (req.params.id as string)) {
      throw new AppError(404, "Invite not found");
    }

    if (invite.status !== "PENDING") {
      throw new AppError(400, "Invite is no longer pending");
    }

    await db.workspaceInvite.update({
      where: { id: req.params.inviteId as string },
      data: { status: "REVOKED" },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/invites/:token/accept — authenticated user accepts an invite */
export async function acceptInvite(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const token  = req.params.token as string;

    const invite = await db.workspaceInvite.findUnique({
      where: { token: token },
      include: { workspace: { select: { id: true, name: true } } },
    });

    if (!invite) throw new AppError(404, "Invite not found");
    if (invite.status !== "PENDING") throw new AppError(410, "Invite is no longer valid");
    if (invite.expiresAt < new Date()) {
      await db.workspaceInvite.update({ where: { token: token }, data: { status: "EXPIRED" } });
      throw new AppError(410, "Invite has expired");
    }

    // Verify the accepting user's email matches the invite
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, "User not found");

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new AppError(403, "This invite was sent to a different email address");
    }

    // Check if already a member
    const existing = await db.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    });
    if (existing) throw new AppError(409, "You are already a member of this workspace");

    // Create membership + mark invite accepted in a transaction
    const [membership] = await db.$transaction([
      db.membership.create({
        data: { userId, workspaceId: invite.workspaceId, role: invite.role },
        include: { workspace: { select: { id: true, name: true } } },
      }),
      db.workspaceInvite.update({
        where: { token: token },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      }),
    ]);

    res.json({ membership });
  } catch (err) {
    next(err);
  }
}

/** GET /api/invites/pending — list invites for the authenticated user's email */
export async function getMyInvites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await db.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError(404, "User not found");

    const invites = await db.workspaceInvite.findMany({
      where: {
        email: user.email.toLowerCase(),
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        workspace: { select: { id: true, name: true, color: true } },
        invitedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ invites });
  } catch (err) {
    next(err);
  }
}

// ── RBAC ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/workspaces/:id/my-permissions
 * Returns the full list of permission keys the calling user holds in this
 * workspace. The frontend uses this to conditionally show/hide controls
 * (e.g. "New Announcement" button, "Invite" button) without re-implementing
 * role logic in the client.
 */
export async function getMyPermissions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const role        = req.membership!.role;
    const permissions = getUserPermissions(role);
    res.json({ role, permissions });
  } catch (err) {
    next(err);
  }
}
