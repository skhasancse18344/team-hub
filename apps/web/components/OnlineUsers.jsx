"use client";
import { useSocketStore } from "../store/useSocketStore";
import styles from "./OnlineUsers.module.css";

const EMPTY_USERS = [];

function UserAvatar({ user, size = 28 }) {
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.3 + "px" }}
      title={user.name}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} className={styles.avatarImg} />
      ) : (
        (user.name ?? "?").slice(0, 2).toUpperCase()
      )}
      <span className={styles.dot} />
    </div>
  );
}

export default function OnlineUsers({ workspaceId, currentUserId }) {
  const onlineUsers = useSocketStore((s) => s.onlineUsers[workspaceId] ?? EMPTY_USERS);
  const connected   = useSocketStore((s) => s.connected);

  if (!connected || onlineUsers.length === 0) return null;

  const MAX_SHOWN = 5;
  const shown    = onlineUsers.slice(0, MAX_SHOWN);
  const overflow = onlineUsers.length - MAX_SHOWN;

  return (
    <div className={styles.root} title={`${onlineUsers.length} online`}>
      <span className={styles.label}>Online</span>
      <div className={styles.stack}>
        {shown.map((u) => (
          <UserAvatar key={u.id} user={u} />
        ))}
        {overflow > 0 && (
          <div className={`${styles.avatar} ${styles.overflow}`}>
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
