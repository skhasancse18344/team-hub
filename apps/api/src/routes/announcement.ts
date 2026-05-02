import { Router } from "express";
import { requireWorkspaceRole } from "../middleware/requireWorkspaceRole";
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
router.get( "/",  requireWorkspaceRole("MEMBER"), getAnnouncements);
router.post("/",  requireWorkspaceRole("ADMIN"),  createAnnouncement);

// Single
router.get(    "/:annId",      requireWorkspaceRole("MEMBER"), getAnnouncement);
router.patch(  "/:annId",      requireWorkspaceRole("MEMBER"), updateAnnouncement);
router.delete( "/:annId",      requireWorkspaceRole("MEMBER"), deleteAnnouncement);

// Pin (ADMIN+)
router.patch("/:annId/pin",    requireWorkspaceRole("ADMIN"),  pinAnnouncement);

// Reactions
router.post("/:annId/reactions", requireWorkspaceRole("MEMBER"), toggleReaction);

// Comments
router.get(    "/:annId/comments",              requireWorkspaceRole("MEMBER"), getComments);
router.post(   "/:annId/comments",              requireWorkspaceRole("MEMBER"), addComment);
router.delete( "/:annId/comments/:commentId",   requireWorkspaceRole("MEMBER"), deleteComment);

export default router;
