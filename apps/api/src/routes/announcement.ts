import { Router } from "express";
import { requirePermission } from "../middleware/requirePermission";
import { requireOwnership } from "../utils/rbac";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";
import {
  getAnnouncements,
  createAnnouncement,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  pinAnnouncement,
  toggleReaction,
  getComments,
  addComment,
  deleteComment,
} from "../controllers/announcement.controller";

const router = Router({ mergeParams: true });

// List / create
router.get( "/",  requirePermission("announcements:view"),   getAnnouncements);
router.post("/",  requirePermission("announcements:create"), createAnnouncement);

// Single — view any, edit/delete own or ADMIN+
router.get("/:annId", requirePermission("announcements:view"), getAnnouncement);

router.patch(
  "/:annId",
  requirePermission("announcements:view"),
  requireOwnership(
    async (req) => {
      const a = await db.announcement.findUnique({ where: { id: req.params.annId as string } });
      if (!a) throw new AppError(404, "Announcement not found");
      return a.authorId;
    },
    "ADMIN"
  ),
  updateAnnouncement
);

router.delete(
  "/:annId",
  requirePermission("announcements:view"),
  requireOwnership(
    async (req) => {
      const a = await db.announcement.findUnique({ where: { id: req.params.annId as string } });
      if (!a) throw new AppError(404, "Announcement not found");
      return a.authorId;
    },
    "ADMIN"
  ),
  deleteAnnouncement
);

// Pin — ADMIN only
router.patch("/:annId/pin", requirePermission("announcements:pin"), pinAnnouncement);

// Reactions
router.post("/:annId/reactions", requirePermission("reactions:toggle"), toggleReaction);

// Comments — create any, delete own or ADMIN+
router.get( "/:annId/comments", requirePermission("announcements:view"), getComments);
router.post("/:annId/comments", requirePermission("comments:create"),   addComment);

router.delete(
  "/:annId/comments/:commentId",
  requirePermission("comments:create"),
  requireOwnership(
    async (req) => {
      const c = await db.comment.findUnique({ where: { id: req.params.commentId as string } });
      if (!c) throw new AppError(404, "Comment not found");
      return c.userId;
    },
    "ADMIN"
  ),
  deleteComment
);

export default router;
