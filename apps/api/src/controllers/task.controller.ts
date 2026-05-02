import { Request, Response, NextFunction } from "express";
import { ActionStatus, Priority } from "../../generated/prisma/client";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";
import { ROLE_RANK } from "../middleware/requireWorkspaceRole";
import { emitToWorkspace } from "../socket";

// ─── Includes ─────────────────────────────────────────────────────────────────

const ASSIGNEE_SELECT = { id: true, name: true, avatarUrl: true };
const GOAL_SELECT     = { id: true, title: true };
const ITEM_INCLUDE    = {
  assignee: { select: ASSIGNEE_SELECT },
  goal:     { select: GOAL_SELECT },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyItem(itemId: string, workspaceId: string) {
  const item = await db.actionItem.findUnique({ where: { id: itemId } });
  if (!item || item.workspaceId !== workspaceId) {
    throw new AppError(404, "Task not found");
  }
  return item;
}

function isAdmin(req: Request): boolean {
  return ROLE_RANK[req.membership!.role] >= ROLE_RANK["ADMIN"];
}

// ─── GET / — list tasks with filters + pagination ─────────────────────────────

export async function getTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const { status, priority, assigneeId, goalId } = req.query;
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
    const skip  = (page - 1) * limit;

    const where: Record<string, unknown> = { workspaceId };
    if (status     && status     !== "ALL") where.status     = status;
    if (priority   && priority   !== "ALL") where.priority   = priority;
    if (assigneeId && assigneeId !== "ALL") where.assigneeId = assigneeId;
    if (goalId     && goalId     !== "ALL") where.goalId     = goalId;

    const [items, total] = await Promise.all([
      db.actionItem.findMany({
        where,
        include: ITEM_INCLUDE,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      db.actionItem.count({ where }),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) { next(err); }
}

// ─── POST / — create task ─────────────────────────────────────────────────────

export async function createTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const { title, description, priority, status, dueDate, assigneeId, goalId } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      throw new AppError(400, "Title is required");
    }
    if (title.trim().length > 300) {
      throw new AppError(400, "Title must be 300 characters or less");
    }
    if (priority && !Object.values(Priority).includes(priority as Priority)) {
      throw new AppError(400, "Invalid priority value");
    }
    if (status && !Object.values(ActionStatus).includes(status as ActionStatus)) {
      throw new AppError(400, "Invalid status value");
    }

    // Validate assignee is a workspace member
    if (assigneeId) {
      const member = await db.membership.findUnique({
        where: { userId_workspaceId: { userId: assigneeId as string, workspaceId } },
      });
      if (!member) throw new AppError(400, "Assignee is not a workspace member");
    }

    // Validate goal belongs to workspace
    if (goalId) {
      const goal = await db.goal.findUnique({ where: { id: goalId as string } });
      if (!goal || goal.workspaceId !== workspaceId) {
        throw new AppError(400, "Goal not found in this workspace");
      }
    }

    const item = await db.actionItem.create({
      data: {
        title:       title.trim(),
        description: description ? String(description).trim() : undefined,
        priority:    (priority as Priority)     ?? "MEDIUM",
        status:      (status as ActionStatus)   ?? "TODO",
        dueDate:     dueDate ? new Date(dueDate as string) : undefined,
        assigneeId:  (assigneeId as string)     ?? undefined,
        goalId:      (goalId as string)         ?? undefined,
        workspaceId,
      },
      include: ITEM_INCLUDE,
    });

    emitToWorkspace(workspaceId, "task_created", { workspaceId, item });
    res.status(201).json({ item });
  } catch (err) { next(err); }
}

// ─── PATCH /:itemId — update task ─────────────────────────────────────────────

export async function updateTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id     as string;
    const itemId      = req.params.itemId as string;

    await verifyItem(itemId, workspaceId);

    const { title, description, priority, status, dueDate, assigneeId, goalId } = req.body;
    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        throw new AppError(400, "Title cannot be empty");
      }
      if (title.trim().length > 300) throw new AppError(400, "Title too long");
      data.title = title.trim();
    }
    if (description !== undefined) {
      data.description = description ? String(description).trim() : null;
    }
    if (priority !== undefined) {
      if (!Object.values(Priority).includes(priority as Priority)) {
        throw new AppError(400, "Invalid priority");
      }
      data.priority = priority;
    }
    if (status !== undefined) {
      if (!Object.values(ActionStatus).includes(status as ActionStatus)) {
        throw new AppError(400, "Invalid status");
      }
      data.status = status;
    }
    if (dueDate !== undefined) {
      data.dueDate = dueDate ? new Date(dueDate as string) : null;
    }
    if ("assigneeId" in req.body) {
      if (assigneeId) {
        const member = await db.membership.findUnique({
          where: { userId_workspaceId: { userId: assigneeId as string, workspaceId } },
        });
        if (!member) throw new AppError(400, "Assignee is not a workspace member");
      }
      data.assigneeId = assigneeId ?? null;
    }
    if ("goalId" in req.body) {
      if (goalId) {
        const goal = await db.goal.findUnique({ where: { id: goalId as string } });
        if (!goal || goal.workspaceId !== workspaceId) {
          throw new AppError(400, "Goal not found");
        }
      }
      data.goalId = goalId ?? null;
    }

    const item = await db.actionItem.update({
      where:   { id: itemId },
      data,
      include: ITEM_INCLUDE,
    });

    emitToWorkspace(workspaceId, "task_updated", { workspaceId, item });
    res.json({ item });
  } catch (err) { next(err); }
}

// ─── DELETE /:itemId — delete task ────────────────────────────────────────────

export async function deleteTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id     as string;
    const itemId      = req.params.itemId as string;
    const userId      = req.user!.id;

    const existing = await verifyItem(itemId, workspaceId);

    // ADMIN+, or the person it's assigned to, or anyone (members can manage team tasks)
    // Policy: any member can delete tasks they own or are assigned; ADMIN can delete any
    if (!isAdmin(req) && existing.assigneeId !== userId) {
      throw new AppError(403, "You don't have permission to delete this task");
    }

    await db.actionItem.delete({ where: { id: itemId } });
    emitToWorkspace(workspaceId, "task_deleted", { workspaceId, itemId });
    res.json({ message: "Task deleted" });
  } catch (err) { next(err); }
}
