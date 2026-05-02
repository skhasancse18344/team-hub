"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, Target, MapPin, Users, Megaphone,
  User, Settings, LogOut, Rocket, ListTodo,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { useGoalStore } from "../../store/useGoalStore";
import WorkspaceSwitcher from "../../components/WorkspaceSwitcher";

const navItems = [
  { href: "/dashboard",               Icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/workspaces",    Icon: Building2,       label: "Workspaces",    badgeKey: "workspaces" },
  { href: "/dashboard/goals",         Icon: Target,          label: "Goals",          badgeKey: "goals" },
//   { href: "/dashboard/milestones",    Icon: MapPin,          label: "Milestones" },
  { href: "/dashboard/team",          Icon: Users,           label: "Team" },
  { href: "/dashboard/announcements", Icon: Megaphone,       label: "Announcements" },
  { href: "/dashboard/tasks",          Icon: ListTodo,        label: "Tasks" },
];

const secondaryItems = [
  { href: "/profile",              Icon: User,     label: "Profile" },
  { href: "/dashboard/settings",  Icon: Settings, label: "Settings" },
];

export default function DashboardLayout({ children }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, isAuthenticated, initialized, initialize, logout } = useAuthStore();
  const { workspaces, fetchWorkspaces } = useWorkspaceStore();
  const { total: goalTotal } = useGoalStore();

  const badgeCounts = {
    workspaces: workspaces.length || null,
    goals:      goalTotal        || null,
  };

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (initialized && isAuthenticated) fetchWorkspaces();
  }, [initialized, isAuthenticated]);

  useEffect(() => {
    if (initialized && !isAuthenticated) router.replace("/login");
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="dash-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <Link className="sidebar-logo" href="/">
          <div className="sidebar-logo-icon"><Rocket size={16} /></div>
          <span>TeamHub</span>
        </Link>

        <div style={{ padding: "0 12px 12px" }}>
          <WorkspaceSwitcher />
        </div>

        <div className="sidebar-section">
          <div className="sidebar-heading">Main</div>
          <ul className="sidebar-nav">
            {navItems.map((item) => {
              const badge = item.badgeKey ? badgeCounts[item.badgeKey] : null;
              return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={pathname === item.href ? "active" : ""}
                >
                  <span className="sicon"><item.Icon size={16} /></span>
                  {item.label}
                  {badge ? <span className="sbadge">{badge}</span> : null}
                </Link>
              </li>
              );
            })}
          </ul>
        </div>

        <div className="sidebar-section" style={{ marginTop: 16 }}>
          <div className="sidebar-heading">Account</div>
          <ul className="sidebar-nav">
            {secondaryItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={pathname === item.href ? "active" : ""}>
                  <span className="sicon"><item.Icon size={16} /></span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Sidebar footer */}
        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 8, borderRadius: "var(--r-sm)", background: "var(--surface)" }}>
            <div className="u-av" style={{ width: 34, height: 34, fontSize: "0.78rem", cursor: "default", pointerEvents: "none" }}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? "You"}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm w-full" style={{ justifyContent: "flex-start", gap: 8, padding: "8px 12px" }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="dash-main">
        {children}
      </main>
    </div>
  );
}
