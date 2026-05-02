import { Router } from "express";
import { requireWorkspaceRole } from "../middleware/requireWorkspaceRole";
import { getGoalStats, exportGoalsCsv } from "../controllers/analytics.controller";

// mergeParams: true so /:id flows in from the workspace router
const router = Router({ mergeParams: true });

router.get("/goals",        requireWorkspaceRole("MEMBER"), getGoalStats);
router.get("/goals/export", requireWorkspaceRole("MEMBER"), exportGoalsCsv);

export default router;
