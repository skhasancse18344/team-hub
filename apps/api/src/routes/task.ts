import { Router } from "express";
import { requireWorkspaceRole } from "../middleware/requireWorkspaceRole";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";

const router = Router({ mergeParams: true });

router.get(    "/",          requireWorkspaceRole("MEMBER"), getTasks);
router.post(   "/",          requireWorkspaceRole("MEMBER"), createTask);
router.patch(  "/:itemId",   requireWorkspaceRole("MEMBER"), updateTask);
router.delete( "/:itemId",   requireWorkspaceRole("MEMBER"), deleteTask);

export default router;
