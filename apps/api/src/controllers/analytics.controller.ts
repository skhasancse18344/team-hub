import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db";

// ── GET /api/workspaces/:id/analytics/goals ────────────────────────────────────
export async function getGoalStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;

    // Start of this ISO week (Monday 00:00:00 UTC)
    const now       = new Date();
    const weekStart = new Date(now);
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));

    const [total, completedThisWeek, overdueCount, statusGroups] = await Promise.all([
      db.goal.count({ where: { workspaceId } }),

      db.goal.count({
        where: {
          workspaceId,
          status:    "COMPLETED",
          updatedAt: { gte: weekStart },
        },
      }),

      db.goal.count({
        where: {
          workspaceId,
          dueDate: { lt: now },
          status:  { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),

      db.goal.groupBy({
        by:    ["status"],
        where: { workspaceId },
        _count: { _all: true },
      }),
    ]);

    // Weekly completions — last 6 weeks
    const sixWeeksAgo = new Date(weekStart);
    sixWeeksAgo.setUTCDate(sixWeeksAgo.getUTCDate() - 5 * 7);

    const recentCompleted = await db.goal.findMany({
      where: {
        workspaceId,
        status:    "COMPLETED",
        updatedAt: { gte: sixWeeksAgo },
      },
      select: { updatedAt: true },
    });

    // Build 6 Monday-aligned buckets (oldest → newest)
    const weeklyCompletions = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(weekStart);
      start.setUTCDate(start.getUTCDate() - (5 - i) * 7);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      const label = start.toLocaleDateString("en-US", {
        month: "short", day: "numeric", timeZone: "UTC",
      });
      const completed = recentCompleted.filter(
        (g) => g.updatedAt >= start && g.updatedAt < end
      ).length;
      return { week: label, completed };
    });

    const byStatus = statusGroups.map((g) => ({
      status: g.status as string,
      count:  g._count._all,
    }));

    // Fill in any missing statuses with 0 so the pie always has all 4 slices
    const ALL_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    for (const s of ALL_STATUSES) {
      if (!byStatus.find((b) => b.status === s)) {
        byStatus.push({ status: s, count: 0 });
      }
    }

    res.json({ total, completedThisWeek, overdueCount, byStatus, weeklyCompletions });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/workspaces/:id/analytics/goals/export ────────────────────────────
export async function exportGoalsCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.id as string;

    const goals = await db.goal.findMany({
      where: { workspaceId },
      select: {
        id:        true,
        title:     true,
        status:    true,
        priority:  true,
        progress:  true,
        dueDate:   true,
        createdAt: true,
        updatedAt: true,
        owner:     { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const esc = (val: string | number | null | undefined): string => {
      if (val == null) return "";
      const s = String(val);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = [
      "ID", "Title", "Status", "Priority", "Progress (%)",
      "Due Date", "Owner", "Owner Email", "Created", "Updated",
    ].join(",");

    const rows = goals.map((g) =>
      [
        esc(g.id),
        esc(g.title),
        esc(g.status),
        esc(g.priority),
        g.progress,
        g.dueDate  ? g.dueDate.toISOString().slice(0, 10)  : "",
        esc(g.owner?.name),
        esc(g.owner?.email),
        g.createdAt.toISOString().slice(0, 10),
        g.updatedAt.toISOString().slice(0, 10),
      ].join(",")
    );

    const csv = [header, ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="goals-${workspaceId}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
