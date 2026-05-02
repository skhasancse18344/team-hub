"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building2, Users, Target, CheckSquare,
  Search, Bell, HelpCircle, Plus,
  Megaphone, User, Loader2, ListTodo,
  Circle, Clock, Eye, CheckCircle2,
} from "lucide-react";
import { useAuthStore }         from "../../store/useAuthStore";
import { useWorkspaceStore }    from "../../store/useWorkspaceStore";
import { useGoalStore }         from "../../store/useGoalStore";
import { useTaskStore }         from "../../store/useTaskStore";
import { useAnnouncementStore } from "../../store/useAnnouncementStore";

/* ── Helpers ─────────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function todayString() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function relTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const GOAL_STATUS_COLORS = {
  NOT_STARTED: "#6b7280",
  IN_PROGRESS: "#6366f1",
  COMPLETED:   "#10b981",
  CANCELLED:   "#475569",
};

const TASK_STATUS_META = {
  TODO:        { Icon: Circle,       color: "#6b7280", label: "To Do" },
  IN_PROGRESS: { Icon: Clock,        color: "#f59e0b", label: "In Progress" },
  IN_REVIEW:   { Icon: Eye,          color: "#6366f1", label: "In Review" },
  DONE:        { Icon: CheckCircle2, color: "#10b981", label: "Done" },
};

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { workspaces, activeWorkspace, members, fetchMembers } = useWorkspaceStore();
  const { goals, fetchGoals: loadGoals }                       = useGoalStore();
  const { items, fetchTasks: loadTasks }                       = useTaskStore();
  const { announcements, fetchAnnouncements }                  = useAnnouncementStore();

  const wsId = activeWorkspace?.id;

  useEffect(() => {
    if (!wsId) return;
    fetchMembers(wsId);
    loadGoals(wsId, { limit: 20 });
    loadTasks(wsId, { limit: 50 });
    fetchAnnouncements(wsId);
  }, [wsId]);

  /* ── Derived stats ────────────────────────────────────── */
  const activeGoalCount = goals.filter(
    (g) => g.status === "NOT_STARTED" || g.status === "IN_PROGRESS"
  ).length;

  const openTaskCount = items.filter(
    (i) => i.status !== "DONE" && i.status !== "CANCELLED"
  ).length;

  const stats = [
    {
      Icon: Building2, bg: "rgba(99,102,241,0.18)",
      value: String(workspaces.length), label: "Workspaces",
      change: activeWorkspace?.name ?? "Select a workspace", dir: "neutral",
    },
    {
      Icon: Users, bg: "rgba(6,182,212,0.15)",
      value: String(members.length), label: "Team Members",
      change: members.length === 1 ? "1 person" : `${members.length} people`, dir: "neutral",
    },
    {
      Icon: Target, bg: "rgba(16,185,129,0.15)",
      value: String(activeGoalCount), label: "Active Goals",
      change: `${goals.filter((g) => g.status === "COMPLETED").length} completed`, dir: "up",
    },
    {
      Icon: ListTodo, bg: "rgba(245,158,11,0.15)",
      value: String(openTaskCount), label: "Open Tasks",
      change: `${items.filter((i) => i.status === "DONE").length} done`, dir: "up",
    },
  ];

  /* ── Blended activity feed ───────────────────────────── */
  const activityFeed = useMemo(() => {
    const ann = announcements.slice(0, 10).map((a) => ({
      av:   initials(a.author?.name),
      bg:   "#6366f1",
      msg:  <><strong>{a.author?.name ?? "Someone"}</strong> posted announcement <strong>"{a.title}"</strong></>,
      time: a.createdAt,
    }));
    const gls = goals.slice(0, 10).map((g) => ({
      av:   initials(g.owner?.name),
      bg:   "#8b5cf6",
      msg:  <><strong>{g.owner?.name ?? "Someone"}</strong> {g.status === "COMPLETED" ? "completed" : "set"} goal <strong>"{g.title}"</strong></>,
      time: g.updatedAt ?? g.createdAt,
    }));
    const tsk = items
      .filter((i) => i.status !== "TODO")
      .slice(0, 10)
      .map((i) => ({
        av:   initials(i.assignee?.name),
        bg:   "#10b981",
        msg:  <><strong>{i.assignee?.name ?? "Someone"}</strong> moved task <strong>"{i.title}"</strong> to {TASK_STATUS_META[i.status]?.label ?? i.status}</>,
        time: i.updatedAt ?? i.createdAt,
      }));
    return [...ann, ...gls, ...tsk]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 7);
  }, [announcements, goals, items]);

  /* ── Action items preview ────────────────────────────── */
  const taskPreview = useMemo(
    () =>
      items
        .filter((i) => i.status !== "DONE" && i.status !== "CANCELLED")
        .slice(0, 5),
    [items]
  );

  /* ── Goal progress preview ───────────────────────────── */
  const goalPreview = useMemo(
    () =>
      [...goals]
        .sort((a, b) => {
          const rank = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2, CANCELLED: 3 };
          return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        })
        .slice(0, 4),
    [goals]
  );

  return (
    <>
      {/* ── Top bar ── */}
      <div className="dash-topbar">
        <div className="dash-search">
          <Search size={15} style={{ flexShrink: 0 }} />
          <span>Search anything...</span>
          <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-3)", background: "var(--surface-2)", padding: "2px 8px", borderRadius: 4 }}>⌘K</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-ghost btn-icon" title="Notifications" style={{ position: "relative" }}>
            <Bell size={18} />
          </button>
          <button className="btn btn-ghost btn-icon" title="Help"><HelpCircle size={18} /></button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="dash-content">

        {/* Greeting */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>
              {greeting()}, {firstName} 👋
            </h1>
            <p style={{ color: "var(--text-2)", fontSize: "0.9375rem" }}>{todayString()}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/dashboard/tasks" className="btn btn-ghost btn-sm">
              <ListTodo size={14} /> Tasks
            </Link>
            <Link href="/dashboard/goals" className="btn btn-primary btn-sm">
              <Plus size={14} /> New Goal
            </Link>
          </div>
        </div>

        {/* No workspace banner */}
        {!activeWorkspace && (
          <div style={{ padding: "20px 24px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "var(--r-md)", marginBottom: 24, color: "var(--text-2)", fontSize: "0.9rem" }}>
            No workspace selected. <Link href="/dashboard/workspaces" style={{ color: "var(--accent)", fontWeight: 600 }}>Create or join a workspace</Link> to see your data.
          </div>
        )}

        {/* Stats row */}
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="scard">
              <div className="scard-icon" style={{ background: s.bg }}><s.Icon size={19} style={{ color: "var(--text-2)" }} /></div>
              <div className="scard-value">{s.value}</div>
              <div className="scard-label">{s.label}</div>
              <div className={`scard-change ${s.dir === "up" ? "up" : ""}`} style={{ color: "var(--text-3)" }}>
                {s.change}
              </div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="content-grid">

          {/* Activity feed */}
          <div className="content-block">
            <div className="cb-header">
              <h2>Recent Activity</h2>
              <Link href="/dashboard/announcements" className="btn btn-ghost btn-sm">Announcements</Link>
            </div>
            <div className="cb-body">
              {activityFeed.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-3)", fontSize: "0.875rem" }}>
                  No recent activity.{" "}
                  {!activeWorkspace && (
                    <Link href="/dashboard/workspaces" style={{ color: "var(--accent)" }}>Select a workspace</Link>
                  )}
                </div>
              ) : (
                activityFeed.map((a, i) => (
                  <div key={i} className="activity-item">
                    <div className="act-av" style={{ background: a.bg }}>{a.av}</div>
                    <div className="act-content">
                      <p>{a.msg}</p>
                      <div className="act-time">{relTime(a.time)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Action items */}
            <div className="content-block">
              <div className="cb-header">
                <h2>Action Items</h2>
                <Link href="/dashboard/tasks" className="badge badge-brand" style={{ textDecoration: "none" }}>
                  {openTaskCount} open
                </Link>
              </div>
              <div className="cb-body">
                {taskPreview.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-3)", fontSize: "0.875rem" }}>
                    No open tasks.{" "}
                    <Link href="/dashboard/tasks" style={{ color: "var(--accent)" }}>Create one →</Link>
                  </div>
                ) : (
                  taskPreview.map((t) => {
                    const meta = TASK_STATUS_META[t.status];
                    return (
                      <div key={t.id} className="task-item">
                        <div
                          className="task-check"
                          style={{
                            borderColor: meta?.color,
                            background:  t.status === "DONE" ? meta?.color : "transparent",
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div className="task-title">{t.title}</div>
                          <div className="task-meta" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ color: meta?.color, fontSize: "0.72rem", fontWeight: 600 }}>{meta?.label}</span>
                            {t.assignee && <span>· {t.assignee.name}</span>}
                            {t.dueDate  && (
                              <span>· Due {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {items.length > 5 && (
                  <div style={{ paddingTop: 12, textAlign: "center" }}>
                    <Link href="/dashboard/tasks" className="btn btn-ghost btn-sm">View all tasks</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Goal progress */}
            <div className="content-block">
              <div className="cb-header">
                <h2>Goal Progress</h2>
                <Link href="/dashboard/goals" className="btn btn-ghost btn-sm">All goals</Link>
              </div>
              <div className="cb-body" style={{ paddingBottom: 16 }}>
                {goalPreview.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-3)", fontSize: "0.875rem" }}>
                    No goals yet.{" "}
                    <Link href="/dashboard/goals" style={{ color: "var(--accent)" }}>Create one →</Link>
                  </div>
                ) : (
                  goalPreview.map((g) => {
                    const color = GOAL_STATUS_COLORS[g.status] ?? "#6366f1";
                    return (
                      <Link
                        key={g.id}
                        href={`/dashboard/goals/${g.id}`}
                        style={{ display: "block", textDecoration: "none", padding: "14px 0", borderBottom: "1px solid var(--border)" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>{g.title}</span>
                          <span style={{ fontSize: "0.8125rem", color, fontWeight: 700 }}>{g.progress ?? 0}%</span>
                        </div>
                        <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${g.progress ?? 0}%`, background: color, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Quick actions */}
        <div style={{ marginTop: 24, padding: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { Icon: Building2, label: "New Workspace",  href: "/dashboard/workspaces" },
              { Icon: Target,    label: "Set a Goal",      href: "/dashboard/goals" },
              { Icon: Users,     label: "Manage Team",     href: "/dashboard/team" },
              { Icon: Megaphone, label: "Announcement",    href: "/dashboard/announcements" },
              { Icon: ListTodo,  label: "View Tasks",      href: "/dashboard/tasks" },
              { Icon: User,      label: "Edit Profile",    href: "/profile" },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: "var(--r-sm)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-2)", transition: "all var(--t2)", textDecoration: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderColor = "var(--border-2)"; }}
              >
                <a.Icon size={15} />{a.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
