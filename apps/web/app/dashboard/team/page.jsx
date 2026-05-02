"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Users, UserPlus, Search, Mail, Shield, Crown,
  ChevronDown, Trash2, LogOut, Loader2, AlertTriangle,
  Check, X, MoreVertical, UserCog, Filter,
} from "lucide-react";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";
import { useAuthStore }      from "../../../store/useAuthStore";
import InviteModal           from "../../../components/InviteModal";
import styles from "./team.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_RANK  = { OWNER: 3, ADMIN: 2, MEMBER: 1 };
const ROLE_META  = {
  OWNER:  { label: "Owner",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  Icon: Crown },
  ADMIN:  { label: "Admin",  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  Icon: Shield },
  MEMBER: { label: "Member", color: "#6366f1", bg: "rgba(99,102,241,0.12)",  Icon: Users },
};

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function avatarColor(str) {
  const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
  let h = 0;
  for (let i = 0; i < (str?.length ?? 0); i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function relDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const meta = ROLE_META[role] ?? ROLE_META.MEMBER;
  return (
    <span className={styles.roleBadge} style={{ color: meta.color, background: meta.bg }}>
      <meta.Icon size={11} /> {meta.label}
    </span>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ membership, isMe, canManage, canChangeRole, onRoleChange, onRemove }) {
  const { user, role, createdAt } = membership;
  const displayName  = user?.name  ?? "Unknown";
  const displayEmail = user?.email ?? "";
  const avColor      = avatarColor(displayName);

  const [roleChanging, setRoleChanging] = useState(false);
  const [removing,     setRemoving]     = useState(false);
  const [confirmRm,    setConfirmRm]    = useState(false);

  async function handleRoleChange(e) {
    const newRole = e.target.value;
    if (newRole === role) return;
    setRoleChanging(true);
    try { await onRoleChange(membership.id, newRole); }
    catch {}
    finally { setRoleChanging(false); }
  }

  async function handleRemove() {
    setRemoving(true);
    try { await onRemove(membership.id); }
    catch { setRemoving(false); setConfirmRm(false); }
  }

  return (
    <div className={`${styles.memberRow} ${isMe ? styles.memberRowMe : ""}`}>
      {/* Avatar */}
      <div className={styles.memberAv} style={{ background: avColor }}>
        {user?.avatarUrl
          ? <img src={user.avatarUrl} alt="" className={styles.avImg} />
          : initials(displayName)}
      </div>

      {/* Info */}
      <div className={styles.memberInfo}>
        <div className={styles.memberName}>
          {displayName}
          {isMe && <span className={styles.youChip}>You</span>}
        </div>
        <div className={styles.memberEmail}>{displayEmail}</div>
      </div>

      {/* Role */}
      <div className={styles.memberRole}>
        {canChangeRole ? (
          <div className={styles.roleSelectWrap}>
            {roleChanging
              ? <Loader2 size={14} className={styles.spin} />
              : (
                <select
                  className={styles.roleSelect}
                  value={role}
                  onChange={handleRoleChange}
                  disabled={roleChanging}
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              )}
          </div>
        ) : (
          <RoleBadge role={role} />
        )}
      </div>

      {/* Joined */}
      <div className={styles.memberJoined}>
        Joined {relDate(createdAt)}
      </div>

      {/* Actions */}
      <div className={styles.memberActions}>
        {canManage && !isMe && (
          confirmRm ? (
            <>
              <button
                className={`${styles.iconBtn} ${styles.danger}`}
                onClick={handleRemove}
                disabled={removing}
                title="Confirm remove"
              >
                {removing
                  ? <Loader2 size={13} className={styles.spin} />
                  : <Check size={13} />}
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => setConfirmRm(false)}
                title="Cancel"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              className={`${styles.iconBtn} ${styles.dangerHover}`}
              onClick={() => setConfirmRm(true)}
              title="Remove from workspace"
            >
              <Trash2 size={13} />
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Invite Row ───────────────────────────────────────────────────────────────

function InviteRow({ invite, workspaceId, onRevoke }) {
  const [revoking, setRevoking] = useState(false);
  const [confirm,  setConfirm]  = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    try { await onRevoke(invite.id); }
    catch { setRevoking(false); setConfirm(false); }
  }

  const expires = invite.expiresAt
    ? new Date(invite.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div className={styles.inviteRow}>
      <div className={styles.inviteIcon}><Mail size={15} /></div>
      <div className={styles.inviteInfo}>
        <div className={styles.inviteEmail}>{invite.email}</div>
        {expires && <div className={styles.inviteExpiry}>Expires {expires}</div>}
      </div>
      <RoleBadge role={invite.role ?? "MEMBER"} />
      <div className={styles.memberActions}>
        {confirm ? (
          <>
            <button
              className={`${styles.iconBtn} ${styles.danger}`}
              onClick={handleRevoke}
              disabled={revoking}
              title="Confirm revoke"
            >
              {revoking ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
            </button>
            <button className={styles.iconBtn} onClick={() => setConfirm(false)} title="Cancel">
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            className={`${styles.iconBtn} ${styles.dangerHover}`}
            onClick={() => setConfirm(true)}
            title="Revoke invite"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { user }                        = useAuthStore();
  const {
    activeWorkspace, members, invites,
    loading, error,
    fetchMembers, fetchInvites,
    updateMemberRole, removeMember,
    revokeInvite, leaveWorkspace,
  } = useWorkspaceStore();

  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("");
  const [inviteOpen,  setInviteOpen]  = useState(false);
  const [leaving,     setLeaving]     = useState(false);
  const [confirmLeave,setConfirmLeave]= useState(false);

  const wsId = activeWorkspace?.id;

  useEffect(() => {
    if (!wsId) return;
    fetchMembers(wsId);
    fetchInvites(wsId);
  }, [wsId]);

  // Derive my membership
  const myMembership = members.find((m) => m.user?.id === user?.id || m.userId === user?.id);
  const myRole       = myMembership?.role ?? null;
  const isAdmin      = ROLE_RANK[myRole] >= ROLE_RANK["ADMIN"];
  const isOwner      = myRole === "OWNER";

  // Filter + search members
  const filtered = useMemo(() => {
    return members.filter((m) => {
      const name  = (m.user?.name  ?? "").toLowerCase();
      const email = (m.user?.email ?? "").toLowerCase();
      const q     = search.toLowerCase();
      if (q && !name.includes(q) && !email.includes(q)) return false;
      if (roleFilter && m.role !== roleFilter) return false;
      return true;
    });
  }, [members, search, roleFilter]);

  async function handleRoleChange(membershipId, newRole) {
    await updateMemberRole(wsId, membershipId, newRole);
  }

  async function handleRemove(membershipId) {
    await removeMember(wsId, membershipId);
  }

  async function handleRevokeInvite(inviteId) {
    await revokeInvite(wsId, inviteId);
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      await leaveWorkspace(wsId);
      setConfirmLeave(false);
    } catch {
      setLeaving(false);
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="dash-content">
        <div className={styles.noWorkspace}>
          <AlertTriangle size={36} style={{ color: "var(--text-3)" }} />
          <h2>No workspace selected</h2>
          <p>Select or create a workspace to manage your team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-content" style={{ paddingTop: 28 }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Team</h1>
          <p className={styles.subtitle}>
            {activeWorkspace.name} · {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus size={15} /> Invite member
          </button>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} style={{ color: "var(--text-3)" }} />
          <select
            className={styles.roleFilterSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>

        {(search || roleFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setRoleFilter(""); }}>
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Members section ───────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Users size={16} />
            Members
            <span className={styles.count}>{filtered.length}</span>
          </h2>
        </div>

        {/* Table header */}
        <div className={styles.tableHead}>
          <span>Member</span>
          <span>Role</span>
          <span>Joined</span>
          <span />
        </div>

        {loading && members.length === 0 ? (
          <div className={styles.center}>
            <Loader2 size={22} className={styles.spin} />
            <span>Loading members…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            {search || roleFilter ? "No members match the current filters." : "No members found."}
          </div>
        ) : (
          <div className={styles.memberList}>
            {filtered
              .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role])
              .map((m) => {
                const memberId = m.user?.id ?? m.userId;
                const canManage = isAdmin && m.role !== "OWNER" && memberId !== user?.id;
                // Admins can change MEMBER→ADMIN, ADMIN→MEMBER. Only owners can change owner.
                const canChangeRole = canManage && !(!isOwner && m.role === "ADMIN");
                return (
                  <MemberRow
                    key={m.id}
                    membership={m}
                    isMe={memberId === user?.id}
                    canManage={canManage}
                    canChangeRole={canChangeRole}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemove}
                  />
                );
              })}
          </div>
        )}
      </section>

      {/* ── Pending Invites ───────────────────────────────────── */}
      {isAdmin && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Mail size={16} />
              Pending Invites
              {invites.length > 0 && (
                <span className={styles.count}>{invites.length}</span>
              )}
            </h2>
            <button
              className="btn btn-ghost btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus size={13} /> Send invite
            </button>
          </div>

          {invites.length === 0 ? (
            <div className={styles.empty}>
              No pending invites.{" "}
              <button
                className={styles.inlineLink}
                onClick={() => setInviteOpen(true)}
              >
                Invite a member
              </button>
            </div>
          ) : (
            <div className={styles.inviteList}>
              {invites.map((inv) => (
                <InviteRow
                  key={inv.id}
                  invite={inv}
                  workspaceId={wsId}
                  onRevoke={handleRevokeInvite}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Danger Zone ───────────────────────────────────────── */}
      {!isOwner && (
        <section className={`${styles.section} ${styles.dangerSection}`}>
          <h2 className={styles.dangerTitle}>Leave workspace</h2>
          <p className={styles.dangerDesc}>
            You will lose access to all content in <strong>{activeWorkspace.name}</strong>. This action cannot be undone.
          </p>
          {confirmLeave ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>Are you sure?</span>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleLeave}
                disabled={leaving}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                {leaving ? <Loader2 size={13} className={styles.spin} /> : <LogOut size={13} />}
                Yes, leave
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmLeave(false)}>Cancel</button>
            </div>
          ) : (
            <button
              className="btn btn-danger btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => setConfirmLeave(true)}
            >
              <LogOut size={14} /> Leave workspace
            </button>
          )}
        </section>
      )}

      {/* ── Invite Modal ──────────────────────────────────────── */}
      <InviteModal
        workspaceId={wsId}
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  );
}
