import { Router } from "express";
import { requirePermission } from "../middleware/requirePermission";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";

const router = Router({ mergeParams: true });

router.get(    "/",        requirePermission("tasks:view"),       getTasks);
router.post(   "/",        requirePermission("tasks:create"),     createTask);
router.patch(  "/:itemId", requirePermission("tasks:update"),     updateTask);
router.delete( "/:itemId", requirePermission("tasks:delete_any"), deleteTask);

export default router;
