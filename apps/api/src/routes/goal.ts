import { Router } from "express";
import { requirePermission } from "../middleware/requirePermission";
import { requireOwnership } from "../utils/rbac";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";
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
router.get(  "/",        requirePermission("goals:view"),   getGoals);
router.post( "/",        requirePermission("goals:create"), createGoal);
router.get(  "/:goalId", requirePermission("goals:view"),   getGoal);
router.patch("/:goalId", requirePermission("goals:update"), updateGoal);

// Delete — goal owner OR workspace ADMIN+
router.delete(
  "/:goalId",
  requirePermission("goals:view"),
  requireOwnership(
    async (req) => {
      const g = await db.goal.findUnique({ where: { id: req.params.goalId as string } });
      if (!g) throw new AppError(404, "Goal not found");
      return g.ownerId;
    },
    "ADMIN"
  ),
  deleteGoal
);

// ── Milestones ────────────────────────────────────────────────────────────────
router.post(   "/:goalId/milestones",                  requirePermission("milestones:manage"), createMilestone);
router.patch(  "/:goalId/milestones/:milestoneId",     requirePermission("milestones:manage"), updateMilestone);
router.delete( "/:goalId/milestones/:milestoneId",     requirePermission("milestones:manage"), deleteMilestone);

// ── Activity + comments ───────────────────────────────────────────────────────
router.get( "/:goalId/activity",              requirePermission("goals:view"),     getActivity);
router.post("/:goalId/comments",              requirePermission("comments:create"), addComment);

// Comment delete — author OR ADMIN+
router.delete(
  "/:goalId/comments/:activityId",
  requirePermission("comments:create"),
  requireOwnership(
    async (req) => {
      const act = await db.goalActivity.findUnique({ where: { id: req.params.activityId as string } });
      if (!act) throw new AppError(404, "Comment not found");
      return act.userId;
    },
    "ADMIN"
  ),
  deleteComment
);

export default router;
