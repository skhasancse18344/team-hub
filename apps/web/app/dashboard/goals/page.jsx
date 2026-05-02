"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target, Plus, Loader2, Filter, ChevronDown,
  Calendar, User, CheckCircle2, Circle, Clock, XCircle,
  ArrowRight, AlertTriangle,
} from "lucide-react";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";
import { useGoalStore } from "../../../store/useGoalStore";
import { useAuthStore } from "../../../store/useAuthStore";
import styles from "./goals.module.css";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "",            label: "All statuses" },
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED",   label: "Completed" },
  { value: "CANCELLED",   label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "",       label: "All priorities" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH",   label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW",    label: "Low" },
];

const STATUS_META = {
  NOT_STARTED: { label: "Not started", color: "var(--text-2)",  Icon: Circle },
  IN_PROGRESS: { label: "In progress", color: "#f59e0b",        Icon: Clock },
  COMPLETED:   { label: "Completed",   color: "#10b981",        Icon: CheckCircle2 },
  CANCELLED:   { label: "Cancelled",   color: "#6b7280",        Icon: XCircle },
};

const PRIORITY_META = {
  URGENT: { label: "Urgent", color: "#ef4444" },
  HIGH:   { label: "High",   color: "#f97316" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  LOW:    { label: "Low",    color: "#6b7280" },
};

// ── Create goal form ─────────────────────────────────────────────────────────

function CreateGoalForm({ workspaceId, onCreated, onCancel }) {
  const { createGoal, saving } = useGoalStore();
  const [title, setTitle]           = useState("");
  const [description, setDesc]      = useState("");
  const [priority, setPriority]     = useState("MEDIUM");
  const [dueDate, setDueDate]       = useState("");
  const [error, setError]           = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    try {
      const goal = await createGoal(workspaceId, {
        title,
        description: description || undefined,
        priority,
        dueDate: dueDate || undefined,
      });
      onCreated(goal);
    } catch (err) {
      setError(err?.response?.data?.error ?? "Failed to create goal");
    }
  }

  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>New goal</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          autoFocus
          className={styles.input}
          placeholder="Goal title *"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
        />
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
        />
        <div className={styles.formRow}>
          <div className={styles.selectWrap}>
            <label className={styles.selectLabel}>Priority</label>
            <select className={styles.select} value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.slice(1).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.selectWrap}>
            <label className={styles.selectLabel}>Due date</label>
            <input
              type="date"
              className={styles.input}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><Loader2 size={14} className={styles.spin} /> Creating…</> : "Create goal"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onClick }) {
  const meta     = STATUS_META[goal.status]   ?? STATUS_META.NOT_STARTED;
  const priMeta  = PRIORITY_META[goal.priority] ?? PRIORITY_META.MEDIUM;
  const milestoneCount   = goal._count?.milestones ?? 0;

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div className={styles.cardTop}>
        <span className={styles.statusBadge} style={{ color: meta.color, borderColor: meta.color }}>
          <meta.Icon size={12} />
          {meta.label}
        </span>
        <span className={styles.priorityDot} style={{ background: priMeta.color }} title={priMeta.label} />
      </div>

      <h2 className={styles.cardTitle}>{goal.title}</h2>
      {goal.description && (
        <p className={styles.cardDesc}>{goal.description}</p>
      )}

      {/* Progress bar */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${goal.progress ?? 0}%` }} />
        </div>
        <span className={styles.progressLabel}>{goal.progress ?? 0}%</span>
      </div>

      <div className={styles.cardMeta}>
        {goal.owner && (
          <span className={styles.metaItem}>
            <div className="u-av" style={{ width: 18, height: 18, fontSize: "0.55rem", flexShrink: 0 }}>
              {goal.owner.avatarUrl
                ? <img src={goal.owner.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                : (goal.owner.name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            {goal.owner.name}
          </span>
        )}
        {milestoneCount > 0 && (
          <span className={styles.metaItem}>
            <Target size={12} /> {milestoneCount} milestone{milestoneCount !== 1 ? "s" : ""}
          </span>
        )}
        {goal.dueDate && (
          <span className={styles.metaItem}>
            <Calendar size={12} />
            {new Date(goal.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      <div className={styles.cardArrow}>
        <ArrowRight size={14} />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const router = useRouter();
  const { user }              = useAuthStore();
  const { activeWorkspace }   = useWorkspaceStore();
  const { goals, total, loading, error, fetchGoals } = useGoalStore();

  const [showCreate, setShowCreate]   = useState(false);
  const [statusFilter, setStatus]     = useState("");
  const [priorityFilter, setPriority] = useState("");

  useEffect(() => {
    if (!activeWorkspace) return;
    fetchGoals(activeWorkspace.id, {
      ...(statusFilter   && { status:   statusFilter }),
      ...(priorityFilter && { priority: priorityFilter }),
    });
  }, [activeWorkspace?.id, statusFilter, priorityFilter]);

  function handleCreated(goal) {
    setShowCreate(false);
    router.push(`/dashboard/goals/${goal.id}?ws=${activeWorkspace?.id}`);
  }

  if (!activeWorkspace) {
    return (
      <div className={styles.noWorkspace}>
        <AlertTriangle size={32} />
        <h2>No workspace selected</h2>
        <p>Select a workspace from the sidebar to view goals.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Goals</h1>
          <p className={styles.subtitle}>
            {activeWorkspace.name} · {total} goal{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus size={16} /> New goal
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateGoalForm
          workspaceId={activeWorkspace.id}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <Filter size={14} className={styles.filterIcon} />
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={priorityFilter}
          onChange={(e) => setPriority(e.target.value)}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Content */}
      {loading && goals.length === 0 ? (
        <div className={styles.center}>
          <Loader2 size={24} className={styles.spin} />
          <span>Loading goals…</span>
        </div>
      ) : goals.length === 0 ? (
        <div className={styles.empty}>
          <Target size={48} className={styles.emptyIcon} />
          <h2>No goals yet</h2>
          <p>Create a goal to start tracking progress for {activeWorkspace.name}.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Create goal
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onClick={() => router.push(`/dashboard/goals/${goal.id}?ws=${activeWorkspace.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
