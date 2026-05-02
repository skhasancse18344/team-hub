import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireWorkspaceRole } from "../middleware/requireWorkspaceRole";
import goalRouter from "./goal";
import announcementRouter from "./announcement";
import taskRouter from "./task";
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
} from "../controllers/workspace.controller";

const router = Router();

// All workspace routes require authentication
router.use(authenticate);

// ── Workspace CRUD ────────────────────────────────────────────────────────────
router.get("/",    getMyWorkspaces);
router.post("/",   createWorkspace);

router.get(    "/:id", requireWorkspaceRole("MEMBER"), getWorkspace);
router.patch(  "/:id", requireWorkspaceRole("ADMIN"),  updateWorkspace);
router.delete( "/:id", requireWorkspaceRole("OWNER"),  deleteWorkspace);

// ── Members ───────────────────────────────────────────────────────────────────
router.get(    "/:id/members",              requireWorkspaceRole("MEMBER"), getMembers);
router.patch(  "/:id/members/:memberId",    requireWorkspaceRole("ADMIN"),  updateMemberRole);
router.delete( "/:id/members/:memberId",    requireWorkspaceRole("ADMIN"),  removeMember);
router.delete( "/:id/leave",               requireWorkspaceRole("MEMBER"), leaveWorkspace);

// ── Invites ───────────────────────────────────────────────────────────────────
router.get(    "/:id/invites",              requireWorkspaceRole("ADMIN"),  getInvites);
router.post(   "/:id/invites",              requireWorkspaceRole("ADMIN"),  inviteMember);
router.delete( "/:id/invites/:inviteId",    requireWorkspaceRole("ADMIN"),  revokeInvite);

// ── Goals (nested router, inherits authenticate) ──────────────────────────────
router.use("/:id/goals", goalRouter);

// ── Announcements (nested router, inherits authenticate) ──────────────────────
router.use("/:id/announcements", announcementRouter);

// ── Tasks / Action Items ──────────────────────────────────────────────────────
router.use("/:id/tasks", taskRouter);

export default router;

// ── Invite accept / pending (separate router, mounted at /api/invites) ────────
const inviteRouter = Router();
inviteRouter.use(authenticate);
inviteRouter.get("/pending",         getMyInvites);
inviteRouter.post("/:token/accept",  acceptInvite);

export { inviteRouter };
