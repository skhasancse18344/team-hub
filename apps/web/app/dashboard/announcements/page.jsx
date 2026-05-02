"use client";
import { useEffect, useState } from "react";
import {
  Megaphone, Plus, Pin, PinOff, Edit3, Trash2,
  MessageSquare, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, Check, X, Send,
} from "lucide-react";
import { useWorkspaceStore }      from "../../../store/useWorkspaceStore";
import { useAnnouncementStore }   from "../../../store/useAnnouncementStore";
import { useAuthStore }           from "../../../store/useAuthStore";
import styles from "./announcements.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000)    return "just now";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000)return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function Avatar({ user, size = 32 }) {
  return (
    <div
      className="u-av"
      style={{ width: size, height: size, fontSize: size * 0.28 + "rem", flexShrink: 0 }}
    >
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        : (user?.name ?? "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Create / Edit form ───────────────────────────────────────────────────────

function AnnouncementForm({ workspaceId, existing, onDone, onCancel }) {
  const { createAnnouncement, updateAnnouncement, saving } = useAnnouncementStore();
  const [title,   setTitle]   = useState(existing?.title   ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim())   { setError("Title is required");   return; }
    if (!content.trim()) { setError("Content is required"); return; }
    try {
      if (existing) {
        const updated = await updateAnnouncement(workspaceId, existing.id, { title, content });
        onDone(updated);
      } else {
        const ann = await createAnnouncement(workspaceId, { title, content });
        onDone(ann);
      }
    } catch (err) {
      setError(err?.response?.data?.error ?? "Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        autoFocus
        className={styles.input}
        placeholder="Announcement title *"
        value={title}
        maxLength={200}
        onChange={(e) => { setTitle(e.target.value); setError(""); }}
      />
      <textarea
        className={`${styles.input} ${styles.textarea}`}
        placeholder="Write your announcement…"
        value={content}
        rows={5}
        maxLength={10000}
        onChange={(e) => { setContent(e.target.value); setError(""); }}
      />
      <div className={styles.formFooter}>
        {error && <span className={styles.formError}>{error}</span>}
        <div className={styles.formActions}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? <><Loader2 size={14} className={styles.spin} /> Saving…</>
              : existing ? "Save changes" : "Post announcement"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Comment section ──────────────────────────────────────────────────────────

function CommentSection({ ann, workspaceId, userId, canModerate }) {
  const { comments, commentsLoading, fetchComments, addComment, deleteComment, saving } =
    useAnnouncementStore();

  const list         = comments[ann.id] ?? null;
  const loading      = commentsLoading[ann.id] ?? false;
  const [text, setText]       = useState("");
  const [cError, setCError]   = useState("");
  const [confirmDel, setConfirmDel] = useState(null); // commentId

  useEffect(() => {
    if (list === null) fetchComments(workspaceId, ann.id);
  }, [ann.id]);

  async function handlePost(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setCError("");
    try {
      await addComment(workspaceId, ann.id, text);
      setText("");
    } catch (err) {
      setCError(err?.response?.data?.error ?? "Failed to post");
    }
  }

  return (
    <div className={styles.commentSection}>
      {loading ? (
        <div className={styles.commentLoading}>
          <Loader2 size={14} className={styles.spin} /> Loading…
        </div>
      ) : (
        <div className={styles.commentList}>
          {(list ?? []).length === 0 && (
            <p className={styles.noComments}>No comments yet. Be the first!</p>
          )}
          {(list ?? []).map((c) => (
            <div key={c.id} className={styles.comment}>
              <Avatar user={c.user} size={28} />
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <span className={styles.commentAuthor}>{c.user?.name}</span>
                  <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                  {(canModerate || c.user?.id === userId) && (
                    confirmDel === c.id ? (
                      <>
                        <button className={`${styles.iconBtn} ${styles.danger}`}
                          onClick={() => { deleteComment(workspaceId, ann.id, c.id); setConfirmDel(null); }}
                          title="Confirm delete">
                          <Check size={12} />
                        </button>
                        <button className={styles.iconBtn} onClick={() => setConfirmDel(null)} title="Cancel">
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <button className={`${styles.iconBtn} ${styles.dangerHover}`}
                        onClick={() => setConfirmDel(c.id)} title="Delete comment">
                        <Trash2 size={12} />
                      </button>
                    )
                  )}
                </div>
                <p className={styles.commentText}>{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post comment */}
      <form onSubmit={handlePost} className={styles.commentForm}>
        <input
          className={styles.commentInput}
          placeholder="Write a comment…"
          value={text}
          maxLength={2000}
          onChange={(e) => { setText(e.target.value); setCError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(e); } }}
        />
        <button type="submit" className={styles.sendBtn} disabled={saving || !text.trim()} title="Post">
          <Send size={14} />
        </button>
      </form>
      {cError && <p className={styles.formError} style={{ marginTop: 4 }}>{cError}</p>}
    </div>
  );
}

// ─── Announcement card ────────────────────────────────────────────────────────

function AnnouncementCard({ ann, workspaceId, userId, isAdmin, myMembership }) {
  const { pinAnnouncement, deleteAnnouncement, toggleReaction } = useAnnouncementStore();

  const [showComments, setShowComments]   = useState(false);
  const [editing,      setEditing]        = useState(false);
  const [expanded,     setExpanded]       = useState(false);
  const [confirmDel,   setConfirmDel]     = useState(false);
  const [deleting,     setDeleting]       = useState(false);
  const [pinning,      setPinning]        = useState(false);

  const isAuthor   = ann.author?.id === userId;
  const canEdit    = isAdmin || isAuthor;
  const reactions  = ann.reactions ?? [];
  const commentCnt = ann._count?.comments ?? 0;
  const PREVIEW_LEN = 400;
  const isLong     = ann.content.length > PREVIEW_LEN;

  // Group reactions: { emoji → { count, isMine } }
  const reactionGroups = EMOJIS.reduce((acc, emoji) => {
    const group = reactions.filter((r) => r.emoji === emoji);
    acc[emoji] = { count: group.length, isMine: group.some((r) => r.userId === userId) };
    return acc;
  }, {});

  async function handlePin() {
    setPinning(true);
    try { await pinAnnouncement(workspaceId, ann.id); }
    finally { setPinning(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAnnouncement(workspaceId, ann.id);
    } catch { setDeleting(false); setConfirmDel(false); }
  }

  if (editing) {
    return (
      <div className={`${styles.card} ${ann.isPinned ? styles.pinned : ""}`}>
        <AnnouncementForm
          workspaceId={workspaceId}
          existing={ann}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${ann.isPinned ? styles.pinned : ""}`}>
      {/* Card header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardAuthor}>
          <Avatar user={ann.author} size={36} />
          <div>
            <div className={styles.authorName}>{ann.author?.name}</div>
            <div className={styles.authorTime}>{timeAgo(ann.createdAt)}</div>
          </div>
        </div>
        <div className={styles.cardActions}>
          {ann.isPinned && (
            <span className={styles.pinnedBadge}>
              <Pin size={11} /> Pinned
            </span>
          )}
          {isAdmin && (
            <button
              className={styles.iconBtn}
              onClick={handlePin}
              disabled={pinning}
              title={ann.isPinned ? "Unpin" : "Pin announcement"}
            >
              {pinning
                ? <Loader2 size={14} className={styles.spin} />
                : ann.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
          {canEdit && (
            <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Edit">
              <Edit3 size={14} />
            </button>
          )}
          {canEdit && (
            confirmDel ? (
              <>
                <button className={`${styles.iconBtn} ${styles.danger}`} onClick={handleDelete} disabled={deleting} title="Confirm delete">
                  {deleting ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
                </button>
                <button className={styles.iconBtn} onClick={() => setConfirmDel(false)} title="Cancel">
                  <X size={13} />
                </button>
              </>
            ) : (
              <button className={`${styles.iconBtn} ${styles.dangerHover}`} onClick={() => setConfirmDel(true)} title="Delete">
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Title + content */}
      <h2 className={styles.cardTitle}>{ann.title}</h2>
      <div className={styles.cardContent}>
        {isLong && !expanded
          ? ann.content.slice(0, PREVIEW_LEN) + "…"
          : ann.content}
      </div>
      {isLong && (
        <button className={styles.expandBtn} onClick={() => setExpanded((v) => !v)}>
          {expanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Read more</>}
        </button>
      )}

      {/* Reactions */}
      <div className={styles.reactions}>
        {EMOJIS.map((emoji) => {
          const g = reactionGroups[emoji];
          return (
            <button
              key={emoji}
              className={`${styles.reactionBtn} ${g.isMine ? styles.reactionActive : ""}`}
              onClick={() => toggleReaction(workspaceId, ann.id, emoji)}
              title={g.isMine ? `Remove ${emoji}` : `React with ${emoji}`}
            >
              {emoji}{g.count > 0 && <span className={styles.reactionCount}>{g.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Comment toggle */}
      <button
        className={styles.commentToggle}
        onClick={() => setShowComments((v) => !v)}
      >
        <MessageSquare size={14} />
        {commentCnt > 0 ? `${commentCnt} comment${commentCnt !== 1 ? "s" : ""}` : "Comment"}
        {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Comments */}
      {showComments && (
        <CommentSection
          ann={ann}
          workspaceId={workspaceId}
          userId={userId}
          canModerate={isAdmin}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const { user }            = useAuthStore();
  const { activeWorkspace, members, fetchMembers } = useWorkspaceStore();
  const {
    announcements, total, loading, error,
    fetchAnnouncements,
  } = useAnnouncementStore();

  const [showCreate, setShowCreate] = useState(false);

  // Derive the current user's role
  const myMembership = members.find(
    (m) => m.user?.id === user?.id || m.userId === user?.id
  );
  const myRole  = myMembership?.role ?? null;
  const isAdmin = myRole === "ADMIN" || myRole === "OWNER";

  useEffect(() => {
    if (!activeWorkspace) return;
    fetchAnnouncements(activeWorkspace.id);
    if (members.length === 0) fetchMembers(activeWorkspace.id);
  }, [activeWorkspace?.id]);

  const pinned  = announcements.filter((a) => a.isPinned);
  const regular = announcements.filter((a) => !a.isPinned);

  if (!activeWorkspace) {
    return (
      <div className={styles.noWorkspace}>
        <AlertTriangle size={32} />
        <h2>No workspace selected</h2>
        <p>Select a workspace from the sidebar to view announcements.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Announcements</h1>
          <p className={styles.subtitle}>
            {activeWorkspace.name} · {total} post{total !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus size={16} /> New announcement
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && isAdmin && (
        <div className={styles.createCard}>
          <h2 className={styles.createTitle}>New announcement</h2>
          <AnnouncementForm
            workspaceId={activeWorkspace.id}
            onDone={() => setShowCreate(false)}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Error */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Loading */}
      {loading && announcements.length === 0 ? (
        <div className={styles.center}>
          <Loader2 size={26} className={styles.spin} />
          <span>Loading announcements…</span>
        </div>
      ) : announcements.length === 0 ? (
        <div className={styles.empty}>
          <Megaphone size={48} className={styles.emptyIcon} />
          <h2>No announcements yet</h2>
          {isAdmin
            ? <p>Post the first announcement for your team.</p>
            : <p>Your admins haven't posted any announcements yet.</p>}
        </div>
      ) : (
        <div className={styles.feed}>
          {/* Pinned section */}
          {pinned.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>
                <Pin size={13} /> Pinned
              </div>
              {pinned.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  ann={ann}
                  workspaceId={activeWorkspace.id}
                  userId={user?.id}
                  isAdmin={isAdmin}
                />
              ))}
            </section>
          )}

          {/* Regular feed */}
          {regular.length > 0 && (
            <section className={styles.section}>
              {pinned.length > 0 && (
                <div className={styles.sectionLabel}>Latest</div>
              )}
              {regular.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  ann={ann}
                  workspaceId={activeWorkspace.id}
                  userId={user?.id}
                  isAdmin={isAdmin}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
