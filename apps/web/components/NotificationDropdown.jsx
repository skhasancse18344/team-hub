"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2, X, Megaphone, AtSign, Target, UserPlus, ListTodo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "../store/useNotificationStore";
import styles from "./NotificationDropdown.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000)     return "just now";
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TYPE_ICON = {
  MENTION:         <AtSign  size={13} />,
  ANNOUNCEMENT:    <Megaphone size={13} />,
  GOAL_UPDATE:     <Target  size={13} />,
  ACTION_ASSIGNED: <ListTodo size={13} />,
  MEMBERSHIP:      <UserPlus size={13} />,
};

const TYPE_COLOR = {
  MENTION:         "var(--brand)",
  ANNOUNCEMENT:    "var(--amber)",
  GOAL_UPDATE:     "var(--emerald)",
  ACTION_ASSIGNED: "var(--cyan)",
  MEMBERSHIP:      "var(--accent)",
};

function ActorAvatar({ actor }) {
  if (!actor) return <div className={styles.actorAv}>?</div>;
  return (
    <div className={styles.actorAv}>
      {actor.avatarUrl
        ? <img src={actor.avatarUrl} alt={actor.name} className={styles.actorImg} />
        : actor.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function NotificationItem({ notif, onRead, onDelete, onNavigate }) {
  return (
    <div
      className={`${styles.item} ${notif.isRead ? styles.read : styles.unread}`}
      onClick={() => {
        onRead(notif.id);
        if (notif.link) onNavigate(notif.link);
      }}
    >
      <div className={styles.itemLeft}>
        <div className={styles.avatarWrap}>
          <ActorAvatar actor={notif.actor} />
          <span className={styles.typeDot} style={{ background: TYPE_COLOR[notif.type] ?? "var(--brand)" }}>
            {TYPE_ICON[notif.type] ?? <Bell size={11} />}
          </span>
        </div>
      </div>
      <div className={styles.itemBody}>
        <p className={styles.itemMsg}>{notif.message}</p>
        <span className={styles.itemTime}>{timeAgo(notif.createdAt)}</span>
      </div>
      <button
        className={styles.deleteBtn}
        onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
        title="Dismiss"
      >
        <X size={12} />
      </button>
      {!notif.isRead && <span className={styles.unreadDot} />}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const {
    notifications, unreadCount, loading, initialized,
    fetchNotifications, markRead, markAllRead, deleteNotification,
  } = useNotificationStore();

  // Fetch on first open
  useEffect(() => {
    if (open && !initialized) fetchNotifications();
  }, [open, initialized]);

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function handleNavigate(link) {
    setOpen(false);
    router.push(link);
  }

  return (
    <div className={styles.root} ref={ref}>
      {/* Bell button */}
      <button
        className={`${styles.bell} ${open ? styles.bellActive : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button className={styles.headerBtn} onClick={markAllRead} title="Mark all as read">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {loading && (
              <div className={styles.empty}>
                <div className="spinner" style={{ width: 22, height: 22 }} />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className={styles.empty}>
                <Bell size={28} style={{ opacity: 0.25 }} />
                <p>You're all caught up!</p>
              </div>
            )}
            {!loading && notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notif={n}
                onRead={markRead}
                onDelete={deleteNotification}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
