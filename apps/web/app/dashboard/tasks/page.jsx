"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutGrid, List, Plus, X, Check, Loader2, AlertTriangle,
  Calendar, Flag, Target, User, Trash2, Edit3, ChevronDown,
  GripVertical, Circle, Clock, Eye, CheckCircle2, XCircle, Filter,
} from "lucide-react";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";
import { useTaskStore }      from "../../../store/useTaskStore";
import { useAuthStore }      from "../../../store/useAuthStore";
import { fetchGoals }        from "../../../lib/api";
import styles from "./tasks.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  { status: "TODO",        label: "To Do",       color: "#6b7280", Icon: Circle },
  { status: "IN_PROGRESS", label: "In Progress",  color: "#f59e0b", Icon: Clock },
  { status: "IN_REVIEW",   label: "In Review",    color: "#6366f1", Icon: Eye },
  { status: "DONE",        label: "Done",         color: "#10b981", Icon: CheckCircle2 },
  { status: "CANCELLED",   label: "Cancelled",    color: "#475569", Icon: XCircle },
];

const PRIORITY_META = {
  URGENT: { label: "Urgent", color: "#ef4444", dot: "#ef4444" },
  HIGH:   { label: "High",   color: "#f97316", dot: "#f97316" },
  MEDIUM: { label: "Medium", color: "#f59e0b", dot: "#f59e0b" },
  LOW:    { label: "Low",    color: "#6b7280", dot: "#6b7280" },
};

const STATUS_OPTIONS  = [
  { value: "",           label: "All statuses" },
  { value: "TODO",       label: "To Do" },
  { value: "IN_PROGRESS",label: "In Progress" },
  { value: "IN_REVIEW",  label: "In Review" },
  { value: "DONE",       label: "Done" },
  { value: "CANCELLED",  label: "Cancelled" },
];
const PRIORITY_OPTIONS = [
  { value: "",       label: "All priorities" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH",   label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW",    label: "Low" },
];

function timeLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const isPast = d < now;
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isPast,
  };
}

// ─── Create / Edit Task Modal ─────────────────────────────────────────────────

function TaskModal({ workspaceId, members, goals, existing, defaultStatus, onSave, onClose }) {
  const { createTask, updateTask, saving } = useTaskStore();

  const [title,      setTitle]      = useState(existing?.title       ?? "");
  const [desc,       setDesc]       = useState(existing?.description ?? "");
  const [priority,   setPriority]   = useState(existing?.priority    ?? "MEDIUM");
  const [status,     setStatus]     = useState(existing?.status      ?? defaultStatus ?? "TODO");
  const [assigneeId, setAssigneeId] = useState(existing?.assigneeId  ?? "");
  const [goalId,     setGoalId]     = useState(existing?.goalId      ?? "");
  const [dueDate,    setDueDate]    = useState(
    existing?.dueDate ? new Date(existing.dueDate).toISOString().split("T")[0] : ""
  );
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    try {
      const payload = {
        title,
        description: desc       || undefined,
        priority,
        status,
        assigneeId:  assigneeId || undefined,
        goalId:      goalId     || undefined,
        dueDate:     dueDate    || undefined,
      };
      if (existing) {
        await updateTask(workspaceId, existing.id, payload);
      } else {
        await createTask(workspaceId, payload);
      }
      onSave();
    } catch (err) {
      setError(err?.response?.data?.error ?? "Failed to save task");
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{existing ? "Edit task" : "New task"}</h2>
          <button className={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <input
            autoFocus
            className={styles.finput}
            placeholder="Task title *"
            value={title}
            maxLength={300}
            onChange={(e) => { setTitle(e.target.value); setError(""); }}
          />
          <textarea
            className={`${styles.finput} ${styles.textarea}`}
            placeholder="Description (optional)"
            value={desc}
            rows={3}
            onChange={(e) => setDesc(e.target.value)}
          />

          <div className={styles.modalRow}>
            {/* Priority */}
            <div className={styles.modalField}>
              <label className={styles.flabel}>Priority</label>
              <select className={styles.finput} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            {/* Status */}
            <div className={styles.modalField}>
              <label className={styles.flabel}>Status</label>
              <select className={styles.finput} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.slice(1).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.modalRow}>
            {/* Assignee */}
            <div className={styles.modalField}>
              <label className={styles.flabel}>Assign to</label>
              <select className={styles.finput} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId ?? m.user?.id} value={m.userId ?? m.user?.id}>
                    {m.user?.name ?? m.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Due date */}
            <div className={styles.modalField}>
              <label className={styles.flabel}>Due date</label>
              <input
                type="date"
                className={styles.finput}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Link to goal */}
          <div className={styles.modalField}>
            <label className={styles.flabel}>Link to goal (optional)</label>
            <select className={styles.finput} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">No goal</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>

          {error && <p className={styles.ferr}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? <><Loader2 size={14} className={styles.spin} /> Saving…</>
                : existing ? "Save changes" : "Create task"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  item, workspaceId, members, goals, isAdmin,
  userId, onDragStart, onDelete,
}) {
  const { updateTask, saving } = useTaskStore();
  const [editing,    setEditing]    = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const pri    = PRIORITY_META[item.priority] ?? PRIORITY_META.MEDIUM;
  const due    = timeLabel(item.dueDate);
  const col    = COLUMNS.find((c) => c.status === item.status);

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(item.id); }
    catch { setDeleting(false); setConfirmDel(false); }
  }

  const canEdit = isAdmin || item.assignee?.id === userId;

  if (editing) {
    return (
      <div className={styles.card}>
        <TaskModal
          workspaceId={workspaceId}
          members={members}
          goals={goals}
          existing={item}
          onSave={() => setEditing(false)}
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={styles.card}
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      style={{ borderLeftColor: pri.color }}
    >
      {/* Top row: priority + actions */}
      <div className={styles.cardTop}>
        <span className={styles.priorityBadge} style={{ color: pri.color }}>
          <span className={styles.priorityDot} style={{ background: pri.color }} />
          {pri.label}
        </span>
        <div className={styles.cardActions}>
          {canEdit && (
            <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Edit">
              <Edit3 size={12} />
            </button>
          )}
          {confirmDel ? (
            <>
              <button
                className={`${styles.iconBtn} ${styles.danger}`}
                onClick={handleDelete}
                disabled={deleting}
                title="Confirm delete"
              >
                {deleting ? <Loader2 size={12} className={styles.spin} /> : <Check size={12} />}
              </button>
              <button className={styles.iconBtn} onClick={() => setConfirmDel(false)} title="Cancel">
                <X size={12} />
              </button>
            </>
          ) : (
            <button
              className={`${styles.iconBtn} ${styles.dangerHover}`}
              onClick={() => setConfirmDel(true)}
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <p className={`${styles.cardTitle} ${item.status === "DONE" ? styles.cardDone : ""}`}>
        {item.title}
      </p>

      {/* Goal link */}
      {item.goal && (
        <span className={styles.cardGoal}>
          <Target size={11} /> {item.goal.title}
        </span>
      )}

      {/* Footer: assignee + due date */}
      <div className={styles.cardFooter}>
        {item.assignee ? (
          <div className={styles.assignee}>
            <div className="u-av" style={{ width: 20, height: 20, fontSize: "0.55rem", flexShrink: 0 }}>
              {item.assignee.avatarUrl
                ? <img src={item.assignee.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                : (item.assignee.name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <span>{item.assignee.name}</span>
          </div>
        ) : (
          <span className={styles.unassigned}>Unassigned</span>
        )}
        {due && (
          <span className={`${styles.dueDate} ${due.isPast && item.status !== "DONE" ? styles.overdue : ""}`}>
            <Calendar size={11} /> {due.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  col, items, workspaceId, members, goals, isAdmin, userId,
  onDragStart, onDragOver, onDrop, onDelete, onAddTask,
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
    onDragOver(e);
  }

  function handleDragLeave() { setDragOver(false); }

  function handleDrop(e) {
    setDragOver(false);
    onDrop(e, col.status);
  }

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <div className={styles.columnTitle}>
          <span className={styles.columnDot} style={{ background: col.color }} />
          <col.Icon size={14} style={{ color: col.color }} />
          <span style={{ color: col.color }}>{col.label}</span>
          <span className={styles.columnCount}>{items.length}</span>
        </div>
        <button
          className={styles.columnAdd}
          onClick={() => onAddTask(col.status)}
          title={`Add task to ${col.label}`}
        >
          <Plus size={14} />
        </button>
      </div>

      <div
        className={`${styles.dropZone} ${dragOver ? styles.dragOver : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {items.length === 0 && (
          <div className={styles.emptyCol}>Drop tasks here</div>
        )}
        {items.map((item) => (
          <TaskCard
            key={item.id}
            item={item}
            workspaceId={workspaceId}
            members={members}
            goals={goals}
            isAdmin={isAdmin}
            userId={userId}
            onDragStart={onDragStart}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ items, workspaceId, members, goals, isAdmin, userId, onDelete, onEdit }) {
  return (
    <div className={styles.listView}>
      {/* Header row */}
      <div className={styles.listHeader}>
        <span className={styles.listColPri}>Priority</span>
        <span className={styles.listColTitle}>Task</span>
        <span className={styles.listColStatus}>Status</span>
        <span className={styles.listColAssignee}>Assignee</span>
        <span className={styles.listColDue}>Due</span>
        <span className={styles.listColActions} />
      </div>

      {items.length === 0 ? (
        <div className={styles.listEmpty}>No tasks match the current filters.</div>
      ) : (
        items.map((item) => {
          const pri = PRIORITY_META[item.priority] ?? PRIORITY_META.MEDIUM;
          const col = COLUMNS.find((c) => c.status === item.status);
          const due = timeLabel(item.dueDate);
          const canEdit = isAdmin || item.assignee?.id === userId;

          return (
            <div key={item.id} className={styles.listRow}>
              <span className={styles.listColPri}>
                <span className={styles.priorityDot} style={{ background: pri.color }} />
                <span style={{ color: pri.color, fontSize: "0.78rem" }}>{pri.label}</span>
              </span>

              <div className={styles.listColTitle}>
                <span className={`${styles.listTitle} ${item.status === "DONE" ? styles.cardDone : ""}`}>
                  {item.title}
                </span>
                {item.goal && (
                  <span className={styles.cardGoal}>
                    <Target size={11} /> {item.goal.title}
                  </span>
                )}
              </div>

              <span className={styles.listColStatus}>
                <span className={styles.statusChip} style={{ color: col?.color, borderColor: col?.color }}>
                  {col && <col.Icon size={12} />} {col?.label}
                </span>
              </span>

              <span className={styles.listColAssignee}>
                {item.assignee ? (
                  <div className={styles.assignee}>
                    <div className="u-av" style={{ width: 20, height: 20, fontSize: "0.55rem", flexShrink: 0 }}>
                      {item.assignee.avatarUrl
                        ? <img src={item.assignee.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        : (item.assignee.name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <span>{item.assignee.name}</span>
                  </div>
                ) : <span className={styles.unassigned}>—</span>}
              </span>

              <span className={styles.listColDue}>
                {due ? (
                  <span className={`${styles.dueDate} ${due.isPast && item.status !== "DONE" ? styles.overdue : ""}`}>
                    <Calendar size={11} /> {due.label}
                  </span>
                ) : "—"}
              </span>

              <span className={styles.listColActions}>
                {canEdit && (
                  <button className={styles.iconBtn} onClick={() => onEdit(item)} title="Edit">
                    <Edit3 size={13} />
                  </button>
                )}
                <button
                  className={`${styles.iconBtn} ${styles.dangerHover}`}
                  onClick={() => onDelete(item.id)}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user }                = useAuthStore();
  const { activeWorkspace, members, fetchMembers } = useWorkspaceStore();
  const { items, total, loading, error, fetchTasks, moveTask, deleteTask } = useTaskStore();

  const [viewMode,       setViewMode]       = useState("kanban"); // "kanban" | "list"
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editItem,       setEditItem]       = useState(null);
  const [defaultStatus,  setDefaultStatus]  = useState("TODO");
  const [goals,          setGoals]          = useState([]);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  const dragId = useRef(null);

  const workspaceId = activeWorkspace?.id;

  // Derive role
  const myMembership = members.find(
    (m) => m.user?.id === user?.id || m.userId === user?.id
  );
  const myRole  = myMembership?.role ?? null;
  const isAdmin = myRole === "ADMIN" || myRole === "OWNER";

  // Load on mount / workspace change
  useEffect(() => {
    if (!workspaceId) return;
    fetchTasks(workspaceId);
    if (members.length === 0) fetchMembers(workspaceId);
    // Load goals for the create form
    fetchGoals(workspaceId, { limit: 100 })
      .then((d) => setGoals(d.goals ?? []))
      .catch(() => {});
  }, [workspaceId]);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function handleDragStart(e, itemId) {
    dragId.current = itemId;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e) { e.preventDefault(); }

  function handleDrop(e, targetStatus) {
    e.preventDefault();
    const id = dragId.current;
    dragId.current = null;
    if (!id || !workspaceId) return;
    moveTask(workspaceId, id, targetStatus);
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const filtered = items.filter((i) => {
    if (filterPriority && i.priority !== filterPriority) return false;
    if (filterStatus   && i.status   !== filterStatus)   return false;
    if (filterAssignee && i.assignee?.id !== filterAssignee && i.assigneeId !== filterAssignee) return false;
    return true;
  });

  // Group by status for kanban
  const byStatus = Object.fromEntries(
    COLUMNS.map((c) => [c.status, filtered.filter((i) => i.status === c.status)])
  );

  function openCreate(status = "TODO") {
    setEditItem(null);
    setDefaultStatus(status);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditItem(null);
  }

  async function handleDelete(itemId) {
    if (!workspaceId) return;
    await deleteTask(workspaceId, itemId);
  }

  if (!activeWorkspace) {
    return (
      <div className={styles.noWorkspace}>
        <AlertTriangle size={32} />
        <h2>No workspace selected</h2>
        <p>Select a workspace from the sidebar to view tasks.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.subtitle}>
            {activeWorkspace.name} · {total} task{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          onClick={() => openCreate()}
        >
          <Plus size={16} /> New task
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* View toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${viewMode === "kanban" ? styles.toggleActive : ""}`}
            onClick={() => setViewMode("kanban")}
            title="Kanban view"
          >
            <LayoutGrid size={15} /> Board
          </button>
          <button
            className={`${styles.toggleBtn} ${viewMode === "list" ? styles.toggleActive : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <List size={15} /> List
          </button>
        </div>

        <div className={styles.filters}>
          <Filter size={13} style={{ color: "var(--text-2)" }} />

          {viewMode === "list" && (
            <select
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}

          <select
            className={styles.filterSelect}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="">Anyone</option>
            {members.map((m) => (
              <option key={m.userId ?? m.user?.id} value={m.userId ?? m.user?.id}>
                {m.user?.name ?? m.name}
              </option>
            ))}
          </select>

          {(filterPriority || filterStatus || filterAssignee) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterPriority(""); setFilterStatus(""); setFilterAssignee(""); }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Loading */}
      {loading && items.length === 0 ? (
        <div className={styles.center}>
          <Loader2 size={26} className={styles.spin} />
          <span>Loading tasks…</span>
        </div>
      ) : viewMode === "kanban" ? (
        /* ── Kanban Board ── */
        <div className={styles.kanban}>
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              col={col}
              items={byStatus[col.status] ?? []}
              workspaceId={workspaceId}
              members={members}
              goals={goals}
              isAdmin={isAdmin}
              userId={user?.id}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDelete={handleDelete}
              onAddTask={openCreate}
            />
          ))}
        </div>
      ) : (
        /* ── List View ── */
        <ListView
          items={filtered}
          workspaceId={workspaceId}
          members={members}
          goals={goals}
          isAdmin={isAdmin}
          userId={user?.id}
          onDelete={handleDelete}
          onEdit={openEdit}
        />
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <TaskModal
          workspaceId={workspaceId}
          members={members}
          goals={goals}
          existing={editItem}
          defaultStatus={defaultStatus}
          onSave={closeModal}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
