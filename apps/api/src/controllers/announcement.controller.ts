import { Request, Response, NextFunction } from "express";
import { Announcement } from "../../generated/prisma/client";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";
import { ROLE_RANK } from "../middleware/requireWorkspaceRole";

// ─── Shared include shapes ────────────────────────────────────────────────────

const AUTHOR_SELECT = { id: true, name: true, avatarUrl: true };

const ANN_LIST_INCLUDE = {
  author:    { select: AUTHOR_SELECT },
  reactions: { select: { id: true, emoji: true, userId: true } },
  _count:    { select: { comments: true } },
};

const ANN_DETAIL_INCLUDE = {
  author:    { select: AUTHOR_SELECT },
  reactions: { select: { id: true, emoji: true, userId: true } },
  comments: {
    include: { user: { select: AUTHOR_SELECT } },
    orderBy: { createdAt: "asc" } as object,
  },
};

const VALID_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyAnn(
  annId: string,
  workspaceId: string
): Promise<Announcement> {
  const ann = await db.announcement.findUnique({ where: { id: annId } });
  if (!ann || ann.workspaceId !== workspaceId) {
    throw new AppError(404, "Announcement not found");
  }
  return ann;
}

function isAdmin(req: Request): boolean {
  return ROLE_RANK[req.membership!.role] >= ROLE_RANK["ADMIN"];
}

// ─── Controllers ─────────────────────────────────────────────────────────────

// GET / — list announcements (pinned first, then newest), paginated
export async function getAnnouncements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip  = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where:   { workspaceId },
        include: ANN_LIST_INCLUDE,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      db.announcement.count({ where: { workspaceId } }),
    ]);

    res.json({ announcements, total, page, limit });
  } catch (err) { next(err); }
}

// POST / — create announcement (ADMIN+ enforced at route level)
export async function createAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const userId      = req.user!.id;
    const { title, content } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      throw new AppError(400, "Title is required");
    }
    if (title.trim().length > 200) {
      throw new AppError(400, "Title must be 200 characters or less");
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      throw new AppError(400, "Content is required");
    }
    if (content.trim().length > 10000) {
      throw new AppError(400, "Content must be 10,000 characters or less");
    }

    const announcement = await db.announcement.create({
      data: {
        title:   title.trim(),
        content: content.trim(),
        authorId:    userId,
        workspaceId,
      },
      include: ANN_LIST_INCLUDE,
    });

    res.status(201).json({ announcement });
  } catch (err) { next(err); }
}

// GET /:annId — single announcement with comments + reactions
export async function getAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const annId       = req.params.annId as string;
    await verifyAnn(annId, workspaceId);

    const announcement = await db.announcement.findUnique({
      where:   { id: annId },
      include: ANN_DETAIL_INCLUDE,
    });

    res.json({ announcement });
  } catch (err) { next(err); }
}

// PATCH /:annId — edit title/content (ADMIN+ or own author)
export async function updateAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const annId       = req.params.annId as string;
    const userId = req.user!.id;

    const ann = await verifyAnn(annId, workspaceId);
    if (!isAdmin(req) && ann.authorId !== userId) {
      throw new AppError(403, "Only admins or the author can edit this announcement");
    }

    const { title, content } = req.body;
    const data: Record<string, string> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        throw new AppError(400, "Title cannot be empty");
      }
      if (title.trim().length > 200) {
        throw new AppError(400, "Title must be 200 characters or less");
      }
      data.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) {
        throw new AppError(400, "Content cannot be empty");
      }
      if (content.trim().length > 10000) {
        throw new AppError(400, "Content too long");
      }
      data.content = content.trim();
    }

    const updated = await db.announcement.update({
      where:   { id: annId },
      data,
      include: ANN_LIST_INCLUDE,
    });

    res.json({ announcement: updated });
  } catch (err) { next(err); }
}

// DELETE /:annId — delete (ADMIN+ or own author)
export async function deleteAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const annId       = req.params.annId as string;
    const userId = req.user!.id;

    const ann = await verifyAnn(annId, workspaceId);
    if (!isAdmin(req) && ann.authorId !== userId) {
      throw new AppError(403, "Only admins or the author can delete this announcement");
    }

    await db.announcement.delete({ where: { id: annId } });
    res.json({ message: "Announcement deleted" });
  } catch (err) { next(err); }
}

// PATCH /:annId/pin — toggle pin (ADMIN+ only, enforced at route level)
export async function pinAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const annId       = req.params.annId as string;
    const ann = await verifyAnn(annId, workspaceId);

    const updated = await db.announcement.update({
      where:   { id: annId },
      data:    { isPinned: !ann.isPinned },
      include: ANN_LIST_INCLUDE,
    });

    res.json({ announcement: updated });
  } catch (err) { next(err); }
}

// POST /:annId/reactions — toggle reaction emoji
export async function toggleReaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const annId       = req.params.annId as string;
    const userId = req.user!.id;
    const { emoji } = req.body;

    if (!emoji || !VALID_EMOJIS.includes(emoji)) {
      throw new AppError(400, `Emoji must be one of: ${VALID_EMOJIS.join(" ")}`);
    }

    await verifyAnn(annId, workspaceId);

    const existing = await db.reaction.findUnique({
      where: {
        userId_announcementId_emoji: { userId, announcementId: annId, emoji },
      },
    });

    if (existing) {
      await db.reaction.delete({ where: { id: existing.id } });
    } else {
      await db.reaction.create({ data: { emoji, userId, announcementId: annId } });
    }

    const reactions = await db.reaction.findMany({
      where:  { announcementId: annId },
      select: { id: true, emoji: true, userId: true },
    });

    res.json({ reactions, removed: !!existing });
  } catch (err) { next(err); }
}

// GET /:annId/comments — list comments (MEMBER+ can read)
export async function getComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const annId       = req.params.annId as string;
    await verifyAnn(annId, workspaceId);

    const comments = await db.comment.findMany({
      where:   { announcementId: annId },
      include: { user: { select: AUTHOR_SELECT } },
      orderBy: { createdAt: "asc" },
    });

    res.json({ comments });
  } catch (err) { next(err); }
}

// POST /:annId/comments — add comment
export async function addComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const annId       = req.params.annId as string;
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      throw new AppError(400, "Comment cannot be empty");
    }
    if (content.trim().length > 2000) {
      throw new AppError(400, "Comment must be 2,000 characters or less");
    }

    await verifyAnn(annId, workspaceId);

    const comment = await db.comment.create({
      data:    { content: content.trim(), userId, announcementId: annId },
      include: { user: { select: AUTHOR_SELECT } },
    });

    res.status(201).json({ comment });
  } catch (err) { next(err); }
}

// DELETE /:annId/comments/:commentId — delete comment (author or ADMIN+)
export async function deleteComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const annId       = req.params.annId as string;
    const commentId   = req.params.commentId as string;
    const userId = req.user!.id;

    await verifyAnn(annId, workspaceId);

    const comment = await db.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.announcementId !== annId) {
      throw new AppError(404, "Comment not found");
    }

    if (!isAdmin(req) && comment.userId !== userId) {
      throw new AppError(403, "Only admins or the comment author can delete it");
    }

    await db.comment.delete({ where: { id: commentId } });
    res.json({ message: "Comment deleted" });
  } catch (err) { next(err); }
}
