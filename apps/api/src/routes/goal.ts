import { Router } from "express";
import { requireWorkspaceRole } from "../middleware/requireWorkspaceRole";
import {
  getGoals,
  createGoal,
  getGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getActivity,
  addComment,
  deleteComment,
} from "../controllers/goal.controller";

// mergeParams: true so req.params.id (workspaceId) flows in from workspace router
const router = Router({ mergeParams: true });

// ── Goals ─────────────────────────────────────────────────────────────────────
router.get(    "/",         requireWorkspaceRole("MEMBER"), getGoals);
router.post(   "/",         requireWorkspaceRole("MEMBER"), createGoal);
router.get(    "/:goalId",  requireWorkspaceRole("MEMBER"), getGoal);
router.patch(  "/:goalId",  requireWorkspaceRole("MEMBER"), updateGoal);
router.delete( "/:goalId",  requireWorkspaceRole("OWNER"),  deleteGoal);

// ── Milestones ────────────────────────────────────────────────────────────────
router.post(   "/:goalId/milestones",                       requireWorkspaceRole("MEMBER"), createMilestone);
router.patch(  "/:goalId/milestones/:milestoneId",          requireWorkspaceRole("MEMBER"), updateMilestone);
router.delete( "/:goalId/milestones/:milestoneId",          requireWorkspaceRole("MEMBER"), deleteMilestone);

// ── Activity + comments ───────────────────────────────────────────────────────
router.get(    "/:goalId/activity",                         requireWorkspaceRole("MEMBER"), getActivity);
router.post(   "/:goalId/comments",                         requireWorkspaceRole("MEMBER"), addComment);
router.delete( "/:goalId/comments/:activityId",             requireWorkspaceRole("MEMBER"), deleteComment);

export default router;
