"use client";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Target, CheckCircle2, AlertTriangle, TrendingUp, Download, RefreshCw } from "lucide-react";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";
import { fetchGoalAnalytics, exportGoalsCsvReq } from "../../../lib/api";
import styles from "./analytics.module.css";

// ── Design tokens ─────────────────────────────────────────────────────────────
const PIE_COLORS = {
  NOT_STARTED: "#64748b",
  IN_PROGRESS: "#f59e0b",
  COMPLETED:   "#10b981",
  CANCELLED:   "#6b7280",
};
const BAR_COLOR = "#6366f1";

const STATUS_LABELS = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Completed",
  CANCELLED:   "Cancelled",
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon} style={{ background: color + "22", color }}>
        <Icon size={20} />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardValue}>{value ?? "—"}</div>
        <div className={styles.cardLabel}>{label}</div>
        {sub && <div className={styles.cardSub}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Custom tooltip for bar chart ──────────────────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipVal}>{payload[0].value} completed</div>
    </div>
  );
}

// ── Custom tooltip for pie chart ──────────────────────────────────────────────
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{STATUS_LABELS[name] ?? name}</div>
      <div className={styles.tooltipVal}>{value} goals</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspaceStore();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [csvBusy, setCsvBusy] = useState(false);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchGoalAnalytics(activeWorkspace.id);
      setData(result);
    } catch (e) {
      setError(e?.response?.data?.error ?? "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => { load(); }, [load]);

  async function handleExport() {
    if (!activeWorkspace || csvBusy) return;
    setCsvBusy(true);
    try {
      const blob = await exportGoalsCsvReq(activeWorkspace.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `goals-${activeWorkspace.slug ?? activeWorkspace.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore — user will retry
    } finally {
      setCsvBusy(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const pieData = (data?.byStatus ?? []).map((b) => ({
    name:  b.status,
    value: b.count,
  }));

  const completionRate = data?.total
    ? Math.round(((data.byStatus?.find((b) => b.status === "COMPLETED")?.count ?? 0) / data.total) * 100)
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!activeWorkspace) {
    return (
      <div className={styles.empty}>
        <Target size={40} opacity={0.3} />
        <p>Select a workspace to view analytics.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>{activeWorkspace.name} · goal insights</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={15} className={loading ? styles.spin : undefined} />
            Refresh
          </button>
          <button className={styles.btnPrimary} onClick={handleExport} disabled={csvBusy || !data}>
            <Download size={15} />
            {csvBusy ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stat cards */}
      {loading && !data ? (
        <div className={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <div className={styles.statsGrid}>
          <StatCard
            icon={Target}
            label="Total Goals"
            value={data?.total}
            color="#6366f1"
            sub="across this workspace"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed This Week"
            value={data?.completedThisWeek}
            color="#10b981"
            sub="Mon → now"
          />
          <StatCard
            icon={AlertTriangle}
            label="Overdue"
            value={data?.overdueCount}
            color="#f43f5e"
            sub="past due date, not done"
          />
          <StatCard
            icon={TrendingUp}
            label="Completion Rate"
            value={`${completionRate}%`}
            color="#f59e0b"
            sub="all-time completed / total"
          />
        </div>
      )}

      {/* Charts row */}
      {data && (
        <div className={styles.chartsRow}>
          {/* Weekly bar chart */}
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Weekly Completions</h2>
            <p className={styles.chartSub}>Goals completed per week (last 6 weeks)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.weeklyCompletions} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                <Bar dataKey="completed" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie chart */}
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Goals by Status</h2>
            <p className={styles.chartSub}>Current distribution</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? "#6366f1"} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  formatter={(val) => (
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>
                      {STATUS_LABELS[val] ?? val}
                    </span>
                  )}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
