import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";

const NOTIFICATION_SELECT = {
  id:          true,
  type:        true,
  message:     true,
  userId:      true,
  actorId:     true,
  workspaceId: true,
  isRead:      true,
  link:        true,
  createdAt:   true,
  actor: { select: { id: true, name: true, avatarUrl: true } },
};

// ── GET /api/notifications ─────────────────────────────────────────────────────
// paginated, newest first; optional ?unreadOnly=true
export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId     = req.user!.id;
    const unreadOnly = req.query.unreadOnly === "true";
    const page       = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit      = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip       = (page - 1) * limit;

    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        select:  NOTIFICATION_SELECT,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({ notifications, total, unreadCount, page, limit });
  } catch (err) { next(err); }
}

// ── GET /api/notifications/unread-count ───────────────────────────────────────
export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const count = await db.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ count });
  } catch (err) { next(err); }
}

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────
export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const notif = await db.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) throw new AppError(404, "Notification not found");

    await db.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ── PATCH /api/notifications/read-all ─────────────────────────────────────────
export async function markAllRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await db.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data:  { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
export async function deleteNotification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const notif = await db.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) throw new AppError(404, "Notification not found");

    await db.notification.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ── DELETE /api/notifications ─────────────────────────────────────────────────
export async function clearAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await db.notification.deleteMany({ where: { userId: req.user!.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
