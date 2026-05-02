import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireWorkspaceRole } from "../middleware/requireWorkspaceRole";
import { requirePermission } from "../middleware/requirePermission";
import goalRouter from "./goal";
import announcementRouter from "./announcement";
import taskRouter from "./task";
import analyticsRouter from "./analytics";
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  updateMemberRole,
  removeMember,
  leaveWorkspace,
  inviteMember,
  getInvites,
  revokeInvite,
  acceptInvite,
  getMyInvites,
  getMyPermissions,
} from "../controllers/workspace.controller";

const router = Router();

// All workspace routes require authentication
router.use(authenticate);

// ── Workspace CRUD ────────────────────────────────────────────────────────────
router.get("/",    getMyWorkspaces);
router.post("/",   createWorkspace);

router.get(    "/:id", requirePermission("workspace:view"),   getWorkspace);
router.patch(  "/:id", requirePermission("workspace:update"), updateWorkspace);
router.delete( "/:id", requirePermission("workspace:delete"), deleteWorkspace);

// ── Members ───────────────────────────────────────────────────────────────────
router.get(    "/:id/members",              requirePermission("members:view"),   getMembers);
router.patch(  "/:id/members/:memberId",    requirePermission("members:manage"), updateMemberRole);
router.delete( "/:id/members/:memberId",    requirePermission("members:manage"), removeMember);
router.delete( "/:id/leave",               requirePermission("members:view"),   leaveWorkspace);

// ── Invites ───────────────────────────────────────────────────────────────────
router.get(    "/:id/invites",              requirePermission("invites:view"),   getInvites);
router.post(   "/:id/invites",              requirePermission("invites:send"),   inviteMember);
router.delete( "/:id/invites/:inviteId",    requirePermission("invites:revoke"), revokeInvite);

// ── My permissions (for frontend conditional rendering) ───────────────────────
router.get("/:id/my-permissions", requirePermission("workspace:view"), getMyPermissions);

// ── Goals (nested router, inherits authenticate) ──────────────────────────────
router.use("/:id/goals", goalRouter);

// ── Announcements (nested router, inherits authenticate) ──────────────────────
router.use("/:id/announcements", announcementRouter);

// ── Tasks / Action Items ──────────────────────────────────────────────────────
router.use("/:id/tasks", taskRouter);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.use("/:id/analytics", analyticsRouter);

export default router;

// ── Invite accept / pending (separate router, mounted at /api/invites) ────────
const inviteRouter = Router();
inviteRouter.use(authenticate);
inviteRouter.get("/pending",         getMyInvites);
inviteRouter.post("/:token/accept",  acceptInvite);

export { inviteRouter };
