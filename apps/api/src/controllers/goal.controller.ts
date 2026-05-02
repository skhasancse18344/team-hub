import { Request, Response, NextFunction } from "express";
import {
  GoalStatus,
  MilestoneStatus,
  Priority,
  GoalActivityType,
  Goal,
  Milestone,
} from "../../generated/prisma/client";
import { db } from "../lib/db";
import { AppError } from "../utils/AppError";
import { emitToWorkspace } from "../socket";

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Verify goal belongs to workspace, throw 404 otherwise */
async function verifyGoal(goalId: string, workspaceId: string): Promise<Goal> {
  const goal = await db.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.workspaceId !== workspaceId) {
    throw new AppError(404, "Goal not found");
  }
  return goal;
}

/** Verify milestone belongs to goal, throw 404 otherwise */
async function verifyMilestone(
  milestoneId: string,
  goalId: string
): Promise<Milestone> {
  const m = await db.milestone.findUnique({ where: { id: milestoneId } });
  if (!m || m.goalId !== goalId) throw new AppError(404, "Milestone not found");
  return m;
}

/** Recalculate goal progress as average of all milestone progresses */
async function recalcProgress(goalId: string): Promise<number> {
  const milestones = await db.milestone.findMany({
    where: { goalId },
    select: { progress: true, status: true },
  });
  if (milestones.length === 0) {
    await db.goal.update({ where: { id: goalId }, data: { progress: 0 } });
    return 0;
  }
  const total = milestones.reduce(
    (sum, m) =>
      sum + (m.status === MilestoneStatus.COMPLETED ? 100 : m.progress),
    0
  );
  const avg = Math.round(total / milestones.length);
  await db.goal.update({ where: { id: goalId }, data: { progress: avg } });
  return avg;
}

/** Append an activity record for a goal */
async function logActivity(
  goalId: string,
  userId: string,
  type: GoalActivityType,
  content?: string,
  meta?: Record<string, string>
): Promise<void> {
  await db.goalActivity.create({
    data: {
      goalId,
      userId,
      type,
      content: content ?? null,
      meta:    meta as object ?? undefined,
    },
  });
}

// ─── Goal include shape ───────────────────────────────────────────────────────

const GOAL_INCLUDE = {
  owner: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { milestones: true, actionItems: true, activities: true } },
} as const;

const GOAL_DETAIL_INCLUDE = {
  owner:      { select: { id: true, name: true, avatarUrl: true } },
  milestones: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] as object[] },
  _count:     { select: { milestones: true, actionItems: true, activities: true } },
};

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function getGoals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const {
      status,
      priority,
      ownerId,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { workspaceId };
    if (status)   where.status   = status as GoalStatus;
    if (priority) where.priority = priority as Priority;
    if (ownerId)  where.ownerId  = ownerId;

    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [goals, total] = await Promise.all([
      db.goal.findMany({
        where,
        include: GOAL_INCLUDE,
        orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
        take,
        skip,
      }),
      db.goal.count({ where }),
    ]);

    res.json({ goals, total, page: parseInt(page, 10) || 1, limit: take });
  } catch (err) {
    next(err);
  }
}

export async function createGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const userId      = req.user!.id;

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      ownerId,
    } = req.body as {
      title:        string;
      description?: string;
      status?:      GoalStatus;
      priority?:    Priority;
      dueDate?:     string;
      ownerId?:     string;
    };

    if (!title?.trim()) throw new AppError(400, "Title is required");

    // Owner defaults to the requester; verify they are a workspace member
    const resolvedOwnerId = ownerId ?? userId;
    if (ownerId && ownerId !== userId) {
      const ownerMember = await db.membership.findUnique({
        where: { userId_workspaceId: { userId: ownerId, workspaceId } },
      });
      if (!ownerMember) throw new AppError(400, "Specified owner is not a workspace member");
    }

    const goal = await db.goal.create({
      data: {
        title:       title.trim(),
        description: description?.trim() ?? null,
        status:      status   ?? GoalStatus.NOT_STARTED,
        priority:    priority ?? Priority.MEDIUM,
        dueDate:     dueDate  ? new Date(dueDate) : null,
        ownerId:     resolvedOwnerId,
        workspaceId,
      },
      include: GOAL_DETAIL_INCLUDE,
    });

    await logActivity(goal.id, userId, GoalActivityType.CREATED);

    emitToWorkspace(workspaceId, "goal_created", { workspaceId, goal, actorId: userId });
    res.status(201).json({ goal });
  } catch (err) {
    next(err);
  }
}

export async function getGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: workspaceId, goalId } = req.params;

    const goal = await db.goal.findUnique({
      where: { id: goalId as string },
      include: GOAL_DETAIL_INCLUDE,
    });

    if (!goal || goal.workspaceId !== workspaceId) {
      throw new AppError(404, "Goal not found");
    }

    res.json({ goal });
  } catch (err) {
    next(err);
  }
}

export async function updateGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const goalId      = req.params.goalId as string;
    const userId      = req.user!.id;

    const existing = await verifyGoal(goalId, workspaceId);

    const { title, description, status, priority, dueDate, ownerId } =
      req.body as {
        title?:       string;
        description?: string | null;
        status?:      GoalStatus;
        priority?:    Priority;
        dueDate?:     string | null;
        ownerId?:     string;
      };

    const data: Record<string, unknown> = {};
    if (title       !== undefined) data.title       = title.trim();
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (status      !== undefined) data.status      = status;
    if (priority    !== undefined) data.priority    = priority;
    if (dueDate     !== undefined) data.dueDate     = dueDate ? new Date(dueDate) : null;
    if (ownerId     !== undefined) data.ownerId     = ownerId;

    if (Object.keys(data).length === 0) throw new AppError(400, "Nothing to update");

    const updated = await db.goal.update({
      where:   { id: goalId },
      data,
      include: GOAL_DETAIL_INCLUDE,
    });

    // Activity logging for significant field changes
    if (status && status !== existing.status) {
      await logActivity(goalId, userId, GoalActivityType.STATUS_CHANGED, undefined, {
        from: existing.status,
        to:   status,
      });
    } else if (priority && priority !== existing.priority) {
      await logActivity(goalId, userId, GoalActivityType.PRIORITY_CHANGED, undefined, {
        from: existing.priority,
        to:   priority,
      });
    } else {
      await logActivity(goalId, userId, GoalActivityType.UPDATED);
    }

    emitToWorkspace(workspaceId, "goal_updated", { workspaceId, goal: updated, actorId: userId });
    res.json({ goal: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteGoal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const goalId      = req.params.goalId as string;

    await verifyGoal(goalId, workspaceId);
    await db.goal.delete({ where: { id: goalId } });

    emitToWorkspace(workspaceId, "goal_deleted", { workspaceId, goalId, actorId: req.user!.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function createMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const goalId      = req.params.goalId as string;
    const userId      = req.user!.id;

    await verifyGoal(goalId, workspaceId);

    const { title, description, dueDate, order } = req.body as {
      title:        string;
      description?: string;
      dueDate?:     string;
      order?:       number;
    };

    if (!title?.trim()) throw new AppError(400, "Milestone title is required");

    // Auto-order: put at the end
    const maxOrder = await db.milestone.aggregate({
      where:   { goalId },
      _max:    { order: true },
    });
    const nextOrder = order ?? (maxOrder._max.order ?? -1) + 1;

    const milestone = await db.milestone.create({
      data: {
        title:       title.trim(),
        description: description?.trim() ?? null,
        dueDate:     dueDate ? new Date(dueDate) : null,
        order:       nextOrder,
        goalId,
      },
    });

    await logActivity(goalId, userId, GoalActivityType.MILESTONE_ADDED, milestone.title);
    await recalcProgress(goalId);

    res.status(201).json({ milestone });
  } catch (err) {
    next(err);
  }
}

export async function updateMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId   = req.params.id as string;
    const goalId        = req.params.goalId as string;
    const milestoneId   = req.params.milestoneId as string;
    const userId        = req.user!.id;

    await verifyGoal(goalId, workspaceId);
    const existing = await verifyMilestone(milestoneId, goalId);

    const { title, description, status, progress, dueDate, order } =
      req.body as {
        title?:       string;
        description?: string | null;
        status?:      MilestoneStatus;
        progress?:    number;
        dueDate?:     string | null;
        order?:       number;
      };

    const data: Record<string, unknown> = {};
    if (title       !== undefined) data.title       = title.trim();
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (status      !== undefined) data.status      = status;
    if (dueDate     !== undefined) data.dueDate     = dueDate ? new Date(dueDate) : null;
    if (order       !== undefined) data.order       = order;

    // If status → COMPLETED, force progress to 100
    if (status === MilestoneStatus.COMPLETED) {
      data.progress = 100;
    } else if (progress !== undefined) {
      data.progress = Math.min(100, Math.max(0, progress));
      // If progress is 100 and status isn't explicitly set, mark completed
      if (data.progress === 100 && status === undefined) {
        data.status = MilestoneStatus.COMPLETED;
      } else if ((data.progress as number) > 0 && status === undefined && existing.status === MilestoneStatus.PENDING) {
        data.status = MilestoneStatus.IN_PROGRESS;
      }
    }

    if (Object.keys(data).length === 0) throw new AppError(400, "Nothing to update");

    const milestone = await db.milestone.update({
      where: { id: milestoneId },
      data,
    });

    // Activity logging
    const wasCompleted =
      existing.status !== MilestoneStatus.COMPLETED &&
      milestone.status === MilestoneStatus.COMPLETED;

    if (wasCompleted) {
      await logActivity(goalId, userId, GoalActivityType.MILESTONE_COMPLETED, milestone.title);
    } else {
      await logActivity(goalId, userId, GoalActivityType.MILESTONE_UPDATED, milestone.title);
    }

    const newProgress = await recalcProgress(goalId);

    res.json({ milestone, goalProgress: newProgress });
  } catch (err) {
    next(err);
  }
}

export async function deleteMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const goalId      = req.params.goalId as string;
    const milestoneId = req.params.milestoneId as string;
    const userId      = req.user!.id;

    await verifyGoal(goalId, workspaceId);
    const milestone = await verifyMilestone(milestoneId, goalId);

    await db.milestone.delete({ where: { id: milestoneId } });
    await logActivity(goalId, userId, GoalActivityType.MILESTONE_DELETED, milestone.title);
    await recalcProgress(goalId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export async function getActivity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const goalId      = req.params.goalId as string;

    await verifyGoal(goalId, workspaceId);

    const { cursor, limit = "30" } = req.query as Record<string, string>;
    const take = Math.min(parseInt(limit, 10) || 30, 100);

    const activities = await db.goalActivity.findMany({
      where:   { goalId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const nextCursor =
      activities.length === take ? (activities[activities.length - 1]?.id ?? null) : null;

    res.json({ activities, nextCursor });
  } catch (err) {
    next(err);
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const goalId      = req.params.goalId as string;
    const userId      = req.user!.id;

    await verifyGoal(goalId, workspaceId);

    const { content } = req.body as { content: string };
    if (!content?.trim()) throw new AppError(400, "Comment content is required");

    const activity = await db.goalActivity.create({
      data: {
        goalId,
        userId,
        type:    GoalActivityType.COMMENT_ADDED,
        content: content.trim(),
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const goalId      = req.params.goalId as string;
    const activityId  = req.params.activityId as string;
    const userId      = req.user!.id;

    await verifyGoal(goalId, workspaceId);

    const activity = await db.goalActivity.findUnique({ where: { id: activityId } });
    if (!activity || activity.goalId !== goalId || activity.type !== GoalActivityType.COMMENT_ADDED) {
      throw new AppError(404, "Comment not found");
    }

    // Only author or ADMIN+
    const isAdmin =
      req.membership &&
      (req.membership.role === "ADMIN" || req.membership.role === "OWNER");

    if (activity.userId !== userId && !isAdmin) {
      throw new AppError(403, "Not allowed to delete this comment");
    }

    await db.goalActivity.delete({ where: { id: activityId } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
