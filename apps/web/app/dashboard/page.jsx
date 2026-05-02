"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Building2, Users, Target, MapPin,
  Search, Bell, HelpCircle, Plus,
  Megaphone, User,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

/* ── Mock data ─────────────────────────────────────────────── */
const stats = [
  { Icon: Building2, bg: "rgba(99,102,241,0.18)",  value: "5",  label: "Workspaces",   change: "+1 this month", dir: "up" },
  { Icon: Users,     bg: "rgba(6,182,212,0.15)",   value: "24", label: "Team Members", change: "+3 this month", dir: "up" },
  { Icon: Target,    bg: "rgba(16,185,129,0.15)",  value: "18", label: "Active Goals",  change: "6 completed",  dir: "up" },
  { Icon: MapPin,    bg: "rgba(245,158,11,0.15)",  value: "47", label: "Milestones",   change: "12 overdue",   dir: "down" },
];

const activity = [
  { av: "AK", bg: "#6366f1", msg: <><strong>Alice K.</strong> completed milestone <strong>"Q2 API v2 launch"</strong></>,          time: "2 min ago" },
  { av: "JR", bg: "#8b5cf6", msg: <><strong>James R.</strong> created a new goal <strong>"Improve onboarding NPS"</strong></>,     time: "18 min ago" },
  { av: "ML", bg: "#06b6d4", msg: <><strong>Mia L.</strong> posted an announcement to <strong>"Engineering"</strong></>,           time: "1 hr ago" },
  { av: "TP", bg: "#10b981", msg: <><strong>Tom P.</strong> invited <strong>3 new members</strong> to the workspace</>,            time: "2 hr ago" },
  { av: "SK", bg: "#f59e0b", msg: <><strong>Sara K.</strong> updated the status of <strong>"Website redesign"</strong> to Done</>, time: "Yesterday" },
];

const tasks = [
  { done: true,  title: "Review Q2 OKRs",              meta: "Engineering · Due today" },
  { done: false, title: "Schedule team retrospective",  meta: "General · Due tomorrow" },
  { done: false, title: "Update project milestones",    meta: "Product · Due in 3 days" },
  { done: true,  title: "Publish release notes v2.1",   meta: "Engineering · Done" },
  { done: false, title: "Onboard 2 new engineers",      meta: "People Ops · Due next week" },
];

const goals = [
  { name: "Increase MAU by 40%",          pct: 72, color: "#6366f1" },
  { name: "Ship mobile app v1.0",         pct: 55, color: "#8b5cf6" },
  { name: "Reduce churn to < 3%",         pct: 88, color: "#10b981" },
  { name: "Hire 5 engineers by Q3",       pct: 40, color: "#f59e0b" },
];

/* ── Greeting helper ──────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function todayString() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] ?? "there";

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
            <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, background: "var(--rose)", borderRadius: "50%", border: "2px solid var(--bg)" }} />
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
          <Link href="/dashboard/goals" className="btn btn-primary btn-sm">
            <Plus size={14} /> New Goal
          </Link>
        </div>

        {/* Stats row */}
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="scard">
              <div className="scard-icon" style={{ background: s.bg }}><s.Icon size={19} style={{ color: "var(--text-2)" }} /></div>
              <div className="scard-value">{s.value}</div>
              <div className="scard-label">{s.label}</div>
              <div className={`scard-change ${s.dir}`}>
                {s.dir === "up" ? "↑" : "↓"} {s.change}
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
              <button className="btn btn-ghost btn-sm">View all</button>
            </div>
            <div className="cb-body">
              {activity.map((a, i) => (
                <div key={i} className="activity-item">
                  <div className="act-av" style={{ background: a.bg }}>{a.av}</div>
                  <div className="act-content">
                    <p>{a.msg}</p>
                    <div className="act-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Upcoming tasks */}
            <div className="content-block">
              <div className="cb-header">
                <h2>Action Items</h2>
                <span className="badge badge-brand">{tasks.filter(t => !t.done).length} open</span>
              </div>
              <div className="cb-body">
                {tasks.map((t, i) => (
                  <div key={i} className="task-item">
                    <div className={`task-check${t.done ? " done" : ""}`} />
                    <div>
                      <div className="task-title" style={{ textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1 }}>{t.title}</div>
                      <div className="task-meta">{t.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal progress */}
            <div className="content-block">
              <div className="cb-header">
                <h2>Goal Progress</h2>
                <Link href="/dashboard/goals" className="btn btn-ghost btn-sm">All goals</Link>
              </div>
              <div className="cb-body" style={{ paddingBottom: 16 }}>
                {goals.map((g) => (
                  <div key={g.name} style={{ padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{g.name}</span>
                      <span style={{ fontSize: "0.8125rem", color: g.color, fontWeight: 700 }}>{g.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${g.pct}%`, background: g.color, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Quick actions */}
        <div style={{ marginTop: 24, padding: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { Icon: Building2, label: "New Workspace",   href: "/dashboard/workspaces" },
              { Icon: Target,    label: "Set a Goal",       href: "/dashboard/goals" },
              { Icon: Users,     label: "Invite Member",    href: "/dashboard/team" },
              { Icon: Megaphone, label: "Announcement",     href: "/dashboard/announcements" },
              { Icon: User,      label: "Edit Profile",     href: "/profile" },
            ].map((a) => (
              <Link key={a.label} href={a.href}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 18px", background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: "var(--r-sm)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-2)", transition: "all var(--t2)" }}
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
