import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  clearAll,
} from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get(    "/",                  getNotifications);
router.get(    "/unread-count",      getUnreadCount);
router.patch(  "/read-all",          markAllRead);
router.delete( "/",                  clearAll);
router.patch(  "/:id/read",          markRead);
router.delete( "/:id",               deleteNotification);

export default router;
