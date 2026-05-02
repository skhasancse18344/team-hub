"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Target, Calendar, User, Edit3, Check, X,
  Plus, Trash2, Loader2, AlertTriangle, CheckCircle2,
  Circle, Clock, XCircle, ChevronDown,
  MessageSquare, GitCommitHorizontal, Zap, Flag, Info,
} from "lucide-react";
import { useGoalStore }      from "../../../../store/useGoalStore";
import { useWorkspaceStore } from "../../../../store/useWorkspaceStore";
import { useAuthStore }      from "../../../../store/useAuthStore";
import styles from "./goal-detail.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started", color: "var(--text-2)" },
  { value: "IN_PROGRESS", label: "In progress", color: "#f59e0b" },
  { value: "COMPLETED",   label: "Completed",   color: "#10b981" },
  { value: "CANCELLED",   label: "Cancelled",   color: "#6b7280" },
];

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgent", color: "#ef4444" },
  { value: "HIGH",   label: "High",   color: "#f97316" },
  { value: "MEDIUM", label: "Medium", color: "#f59e0b" },
  { value: "LOW",    label: "Low",    color: "#6b7280" },
];

const STATUS_ICON = {
  NOT_STARTED: Circle,
  IN_PROGRESS: Clock,
  COMPLETED:   CheckCircle2,
  CANCELLED:   XCircle,
};

const ACTIVITY_ICON = {
  CREATED:            { Icon: Plus,               color: "#10b981" },
  UPDATED:            { Icon: Edit3,              color: "#6b7280" },
  STATUS_CHANGED:     { Icon: GitCommitHorizontal, color: "#f59e0b" },
  PRIORITY_CHANGED:   { Icon: Flag,               color: "#f97316" },
  PROGRESS_UPDATED:   { Icon: Zap,                color: "#6366f1" },
  MILESTONE_ADDED:    { Icon: Plus,               color: "#6366f1" },
  MILESTONE_UPDATED:  { Icon: Edit3,              color: "#6b7280" },
  MILESTONE_COMPLETED:{ Icon: CheckCircle2,       color: "#10b981" },
  MILESTONE_DELETED:  { Icon: Trash2,             color: "#ef4444" },
  COMMENT_ADDED:      { Icon: MessageSquare,      color: "var(--accent)" },
  COMMENT_DELETED:    { Icon: Trash2,             color: "#6b7280" },
};

function activityLabel(entry) {
  const user = entry.user?.name ?? "Someone";
  const meta = entry.meta ?? {};
  switch (entry.type) {
    case "CREATED":             return `${user} created this goal`;
    case "UPDATED":             return `${user} updated this goal`;
    case "STATUS_CHANGED":      return `${user} changed status from ${meta.from} to ${meta.to}`;
    case "PRIORITY_CHANGED":    return `${user} changed priority from ${meta.from} to ${meta.to}`;
    case "PROGRESS_UPDATED":    return `${user} updated progress`;
    case "MILESTONE_ADDED":     return `${user} added milestone "${entry.content}"`;
    case "MILESTONE_UPDATED":   return `${user} updated milestone "${entry.content}"`;
    case "MILESTONE_COMPLETED": return `${user} completed milestone "${entry.content}"`;
    case "MILESTONE_DELETED":   return `${user} deleted milestone "${entry.content}"`;
    case "COMMENT_ADDED":       return null; // rendered separately
    case "COMMENT_DELETED":     return `${user} deleted a comment`;
    default:                    return `${user} made a change`;
  }
}

// ─── Milestone item ───────────────────────────────────────────────────────────

function MilestoneItem({ milestone, workspaceId, goalId, canEdit }) {
  const { updateMilestone, deleteMilestone, saving } = useGoalStore();
  const [editing, setEditing]     = useState(false);
  const [titleEdit, setTitleEdit] = useState(milestone.title);
  const [progress, setProgress]   = useState(milestone.progress);
  const [confirmDel, setConfirm]  = useState(false);

  const isCompleted = milestone.status === "COMPLETED";

  async function toggleComplete() {
    if (!canEdit) return;
    await updateMilestone(workspaceId, goalId, milestone.id, {
      status: isCompleted ? "IN_PROGRESS" : "COMPLETED",
    });
  }

  async function handleSave() {
    if (!titleEdit.trim()) return;
    await updateMilestone(workspaceId, goalId, milestone.id, {
      title:    titleEdit.trim(),
      progress: progress,
    });
    setEditing(false);
  }

  async function handleProgressChange(val) {
    setProgress(val);
  }

  async function handleProgressCommit() {
    await updateMilestone(workspaceId, goalId, milestone.id, { progress });
  }

  async function handleDelete() {
    await deleteMilestone(workspaceId, goalId, milestone.id);
  }

  return (
    <div className={`${styles.milestone} ${isCompleted ? styles.milestoneCompleted : ""}`}>
      {/* Checkbox */}
      <button
        className={styles.milestoneCheck}
        onClick={toggleComplete}
        disabled={!canEdit || saving}
        aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        style={{ color: isCompleted ? "#10b981" : "var(--text-2)" }}
      >
        {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      <div className={styles.milestoneBody}>
        {editing ? (
          <div className={styles.milestoneEditRow}>
            <input
              className={styles.milestoneInput}
              value={titleEdit}
              onChange={(e) => setTitleEdit(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              autoFocus
            />
            <button className={styles.iconBtn} onClick={handleSave} title="Save">
              <Check size={14} />
            </button>
            <button className={styles.iconBtn} onClick={() => setEditing(false)} title="Cancel">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className={styles.milestoneTitle}>
            {milestone.title}
            {milestone.dueDate && (
              <span className={styles.milestoneDue}>
                <Calendar size={11} />
                {new Date(milestone.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        )}

        {/* Progress slider */}
        {!isCompleted && (
          <div className={styles.milestoneProgress}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => handleProgressChange(Number(e.target.value))}
              onMouseUp={handleProgressCommit}
              onTouchEnd={handleProgressCommit}
              disabled={!canEdit || saving}
              className={styles.slider}
            />
            <span className={styles.sliderVal}>{progress}%</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className={styles.milestoneActions}>
          {!editing && (
            <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Edit">
              <Edit3 size={13} />
            </button>
          )}
          {confirmDel ? (
            <>
              <button className={`${styles.iconBtn} ${styles.danger}`} onClick={handleDelete} title="Confirm delete">
                <Check size={13} />
              </button>
              <button className={styles.iconBtn} onClick={() => setConfirm(false)} title="Cancel">
                <X size={13} />
              </button>
            </>
          ) : (
            <button className={`${styles.iconBtn} ${styles.dangerHover}`} onClick={() => setConfirm(true)} title="Delete">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity entry ───────────────────────────────────────────────────────────

function ActivityEntry({ entry, userId, workspaceId, goalId, canDelete }) {
  const { deleteComment, saving } = useGoalStore();
  const [confirmDel, setConfirm] = useState(false);
  const isComment = entry.type === "COMMENT_ADDED";
  const info = ACTIVITY_ICON[entry.type] ?? ACTIVITY_ICON.UPDATED;
  const { Icon, color } = info;
  const label = activityLabel(entry);

  async function handleDelete() {
    await deleteComment(workspaceId, goalId, entry.id);
    setConfirm(false);
  }

  const timeAgo = (() => {
    const diff = Date.now() - new Date(entry.createdAt).getTime();
    if (diff < 60000)   return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  })();

  if (isComment) {
    return (
      <div className={styles.activityComment}>
        <div className="u-av" style={{ width: 30, height: 30, fontSize: "0.65rem", flexShrink: 0 }}>
          {entry.user?.avatarUrl
            ? <img src={entry.user.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            : (entry.user?.name ?? "?").slice(0, 2).toUpperCase()}
        </div>
        <div className={styles.commentBubble}>
          <div className={styles.commentHeader}>
            <span className={styles.commentAuthor}>{entry.user?.name ?? "Unknown"}</span>
            <span className={styles.commentTime}>{timeAgo}</span>
            {canDelete && (
              confirmDel ? (
                <>
                  <button className={`${styles.iconBtn} ${styles.danger}`} onClick={handleDelete} title="Confirm delete">
                    <Check size={12} />
                  </button>
                  <button className={styles.iconBtn} onClick={() => setConfirm(false)} title="Cancel">
                    <X size={12} />
                  </button>
                </>
              ) : (
                <button className={`${styles.iconBtn} ${styles.dangerHover}`} onClick={() => setConfirm(true)} title="Delete">
                  <Trash2 size={12} />
                </button>
              )
            )}
          </div>
          <p className={styles.commentText}>{entry.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.activityEntry}>
      <div className={styles.activityIconWrap} style={{ background: `${color}22` }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div className={styles.activityText}>
        <span className={styles.activityLabel}>{label}</span>
        <span className={styles.activityTime}>{timeAgo}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GoalDetailPage() {
  const { id: goalId } = useParams();
  const searchParams   = useSearchParams();
  const wsId           = searchParams.get("ws");
  const router         = useRouter();

  const { user }            = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const workspaceId         = wsId ?? activeWorkspace?.id;

  const {
    activeGoal, activity, nextCursor, loading, saving, error,
    fetchGoal, updateGoal, deleteGoal,
    createMilestone, fetchActivity, addComment,
  } = useGoalStore();

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [editMode,    setEditMode]    = useState(false);
  const [titleEdit,   setTitleEdit]   = useState("");
  const [descEdit,    setDescEdit]    = useState("");
  const [statusEdit,  setStatusEdit]  = useState("");
  const [priorityEdit,setPriorityEdit]= useState("");
  const [dueDateEdit, setDueDateEdit] = useState("");
  const [saveError,   setSaveError]   = useState("");

  const [newMilestone,    setNewMilestone]    = useState("");
  const [milestoneDue,    setMilestoneDue]    = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [msError,         setMsError]         = useState("");

  const [comment,  setComment]  = useState("");
  const [cError,   setCError]   = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // ── Load goal + activity ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    fetchGoal(workspaceId, goalId);
    fetchActivity(workspaceId, goalId);
  }, [workspaceId, goalId]);

  useEffect(() => {
    if (activeGoal) {
      setTitleEdit(activeGoal.title ?? "");
      setDescEdit(activeGoal.description ?? "");
      setStatusEdit(activeGoal.status ?? "NOT_STARTED");
      setPriorityEdit(activeGoal.priority ?? "MEDIUM");
      setDueDateEdit(
        activeGoal.dueDate
          ? new Date(activeGoal.dueDate).toISOString().split("T")[0]
          : ""
      );
    }
  }, [activeGoal?.id]);

  // ── Edit save ─────────────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!titleEdit.trim()) { setSaveError("Title is required"); return; }
    setSaveError("");
    try {
      await updateGoal(workspaceId, goalId, {
        title:       titleEdit,
        description: descEdit   || null,
        status:      statusEdit,
        priority:    priorityEdit,
        dueDate:     dueDateEdit || null,
      });
      setEditMode(false);
      // Refresh activity after edit
      fetchActivity(workspaceId, goalId);
    } catch (err) {
      setSaveError(err?.response?.data?.error ?? "Failed to save");
    }
  }

  // ── Create milestone ──────────────────────────────────────────────────────────
  async function handleAddMilestone(e) {
    e.preventDefault();
    if (!newMilestone.trim()) { setMsError("Title required"); return; }
    setMsError("");
    try {
      await createMilestone(workspaceId, goalId, {
        title:   newMilestone.trim(),
        dueDate: milestoneDue || undefined,
      });
      setNewMilestone("");
      setMilestoneDue("");
      setAddingMilestone(false);
      fetchActivity(workspaceId, goalId);
    } catch (err) {
      setMsError(err?.response?.data?.error ?? "Failed to add milestone");
    }
  }

  // ── Add comment ────────────────────────────────────────────────────────────────
  async function handleAddComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCError("");
    try {
      await addComment(workspaceId, goalId, comment);
      setComment("");
    } catch (err) {
      setCError(err?.response?.data?.error ?? "Failed to post comment");
    }
  }

  // ── Load more activity ────────────────────────────────────────────────────────
  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchActivity(workspaceId, goalId, nextCursor);
    setLoadingMore(false);
  }

  // ── Delete goal ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteGoal(workspaceId, goalId);
      router.push("/dashboard/goals");
    } catch { setDeleting(false); setConfirmDelete(false); }
  }

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (loading && !activeGoal) {
    return (
      <div className={styles.center}>
        <Loader2 size={28} className={styles.spin} />
      </div>
    );
  }

  if (!activeGoal) {
    return (
      <div className={styles.center}>
        <AlertTriangle size={28} />
        <p>{error ?? "Goal not found"}</p>
        <button className="btn btn-ghost" onClick={() => router.push("/dashboard/goals")}>
          <ArrowLeft size={14} /> Back to goals
        </button>
      </div>
    );
  }

  const goal             = activeGoal;
  const milestones       = goal.milestones ?? [];
  const completedMs      = milestones.filter((m) => m.status === "COMPLETED").length;
  const statusMeta       = STATUS_OPTIONS.find((o) => o.value === goal.status) ?? STATUS_OPTIONS[0];
  const priorityMeta     = PRIORITY_OPTIONS.find((o) => o.value === goal.priority) ?? PRIORITY_OPTIONS[2];
  const StatusIcon       = STATUS_ICON[goal.status] ?? Circle;

  return (
    <div className={styles.page}>
      {/* Back */}
      <button className={styles.backBtn} onClick={() => router.push("/dashboard/goals")}>
        <ArrowLeft size={14} /> Goals
      </button>

      {/* ── Two-column layout ── */}
      <div className={styles.layout}>

        {/* ── Left panel ── */}
        <div className={styles.left}>

          {/* Goal header */}
          <div className={styles.goalHeader}>
            <div className={styles.goalIconWrap} style={{ background: `${statusMeta.color}22` }}>
              <Target size={22} style={{ color: statusMeta.color }} />
            </div>

            {editMode ? (
              <div className={styles.editHeader}>
                <input
                  className={styles.titleInput}
                  value={titleEdit}
                  onChange={(e) => { setTitleEdit(e.target.value); setSaveError(""); }}
                />
                <textarea
                  className={`${styles.titleInput} ${styles.descInput}`}
                  value={descEdit}
                  onChange={(e) => setDescEdit(e.target.value)}
                  placeholder="Description"
                  rows={3}
                />
                {saveError && <p className={styles.formError}>{saveError}</p>}
                <div className={styles.editActions}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
                    Save
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditMode(false); setSaveError(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.goalInfo}>
                <h1 className={styles.goalTitle}>{goal.title}</h1>
                {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
                <button className={`btn btn-ghost btn-sm ${styles.editBtn}`} onClick={() => setEditMode(true)}>
                  <Edit3 size={13} /> Edit
                </button>
              </div>
            )}
          </div>

          {/* Meta row */}
          {editMode ? (
            <div className={styles.metaEditRow}>
              <div className={styles.metaField}>
                <label className={styles.metaLabel}>Status</label>
                <select className={styles.metaSelect} value={statusEdit} onChange={(e) => setStatusEdit(e.target.value)}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className={styles.metaField}>
                <label className={styles.metaLabel}>Priority</label>
                <select className={styles.metaSelect} value={priorityEdit} onChange={(e) => setPriorityEdit(e.target.value)}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className={styles.metaField}>
                <label className={styles.metaLabel}>Due date</label>
                <input type="date" className={styles.metaInput} value={dueDateEdit} onChange={(e) => setDueDateEdit(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className={styles.metaRow}>
              <span className={styles.metaBadge} style={{ color: statusMeta.color, borderColor: statusMeta.color }}>
                <StatusIcon size={13} />
                {statusMeta.label}
              </span>
              <span className={styles.metaBadge} style={{ color: priorityMeta.color, borderColor: priorityMeta.color }}>
                <Flag size={12} />
                {priorityMeta.label}
              </span>
              {goal.owner && (
                <span className={styles.metaOwner}>
                  <div className="u-av" style={{ width: 20, height: 20, fontSize: "0.6rem", flexShrink: 0 }}>
                    {goal.owner.avatarUrl
                      ? <img src={goal.owner.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      : (goal.owner.name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  {goal.owner.name}
                </span>
              )}
              {goal.dueDate && (
                <span className={styles.metaItem}>
                  <Calendar size={13} />
                  {new Date(goal.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
          )}

          {/* Progress */}
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span>Progress</span>
              <span className={styles.progressPct}>{goal.progress ?? 0}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${goal.progress ?? 0}%`,
                  background: goal.progress === 100 ? "#10b981" : "var(--accent)",
                }}
              />
            </div>
            <div className={styles.progressSub}>
              {completedMs} of {milestones.length} milestone{milestones.length !== 1 ? "s" : ""} completed
            </div>
          </div>

          {/* ── Milestones ── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Milestones</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setAddingMilestone((v) => !v)}
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {addingMilestone && (
              <form onSubmit={handleAddMilestone} className={styles.addMilestoneForm}>
                <input
                  autoFocus
                  className={styles.msInput}
                  placeholder="Milestone title"
                  value={newMilestone}
                  onChange={(e) => { setNewMilestone(e.target.value); setMsError(""); }}
                />
                <input
                  type="date"
                  className={styles.msInput}
                  value={milestoneDue}
                  onChange={(e) => setMilestoneDue(e.target.value)}
                />
                {msError && <p className={styles.formError}>{msError}</p>}
                <div className={styles.formActions}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? <Loader2 size={13} className={styles.spin} /> : "Add"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setAddingMilestone(false); setNewMilestone(""); setMilestoneDue(""); setMsError(""); }}
                  >Cancel</button>
                </div>
              </form>
            )}

            {milestones.length === 0 ? (
              <p className={styles.emptyMs}>No milestones yet. Add one to track progress.</p>
            ) : (
              <div className={styles.milestoneList}>
                {milestones.map((m) => (
                  <MilestoneItem
                    key={m.id}
                    milestone={m}
                    workspaceId={workspaceId}
                    goalId={goalId}
                    canEdit={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className={styles.dangerZone}>
            <h3 className={styles.dangerTitle}>Danger zone</h3>
            <div className={styles.dangerRow}>
              <div>
                <div className={styles.dangerLabel}>Delete goal</div>
                <div className={styles.dangerHint}>Permanently removes this goal and all milestones.</div>
              </div>
              {confirmDelete ? (
                <div className={styles.confirmRow}>
                  <span className={styles.confirmText}>Sure?</span>
                  <button className={`btn ${styles.dangerBtn}`} onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              ) : (
                <button className={`btn ${styles.dangerBtn}`} onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel: Activity feed ── */}
        <div className={styles.right}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>Activity</h2>

          {/* Comment form */}
          <form onSubmit={handleAddComment} className={styles.commentForm}>
            <div className="u-av" style={{ width: 32, height: 32, fontSize: "0.7rem", flexShrink: 0 }}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                : (user?.name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className={styles.commentInputWrap}>
              <textarea
                className={styles.commentInput}
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => { setComment(e.target.value); setCError(""); }}
                rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(e); } }}
              />
              {cError && <p className={styles.formError}>{cError}</p>}
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={saving || !comment.trim()}
                style={{ alignSelf: "flex-end", marginTop: 6 }}
              >
                {saving ? <Loader2 size={13} className={styles.spin} /> : "Post"}
              </button>
            </div>
          </form>

          {/* Feed */}
          <div className={styles.feed}>
            {activity.length === 0 && !loading ? (
              <p className={styles.emptyFeed}>No activity yet.</p>
            ) : (
              activity.map((entry) => (
                <ActivityEntry
                  key={entry.id}
                  entry={entry}
                  userId={user?.id}
                  workspaceId={workspaceId}
                  goalId={goalId}
                  canDelete={entry.userId === user?.id || entry.type === "COMMENT_ADDED"}
                />
              ))
            )}

            {nextCursor && (
              <button
                className={`btn btn-ghost btn-sm ${styles.loadMoreBtn}`}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 size={13} className={styles.spin} /> : "Load more"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
