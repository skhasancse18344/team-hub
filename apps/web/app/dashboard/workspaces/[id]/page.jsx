"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2, Users, Mail, Settings, Trash2,
  UserCog, UserMinus, ArrowLeft, Loader2, AlertTriangle,
} from "lucide-react";
import { useWorkspaceStore } from "../../../../store/useWorkspaceStore";
import { useAuthStore } from "../../../../store/useAuthStore";
import InviteModal from "../../../../components/InviteModal";
import styles from "./workspace-detail.module.css";

const TABS = ["General", "Members", "Invites"];

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    workspaces, members, loading, error,
    fetchWorkspaces, fetchMembers,
    updateWorkspace, deleteWorkspace, leaveWorkspace,
    updateMemberRole, removeMember,
  } = useWorkspaceStore();

  const workspace = workspaces.find((w) => w.id === id) ?? null;
  const myMembership = members.find((m) => m.user?.id === user?.id || m.userId === user?.id);
  const myRole = myMembership?.role ?? workspace?.myRole;

  const [tab, setTab] = useState("General");
  const [inviteOpen, setInviteOpen] = useState(false);

  // General form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Danger zone
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!workspace) fetchWorkspaces();
    fetchMembers(id);
  }, [id]);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name ?? "");
      setDescription(workspace.description ?? "");
      setColor(workspace.color ?? "");
    }
  }, [workspace]);

  async function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setSaveError("Name is required"); return; }
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      await updateWorkspace(id, { name: trimmed, description: description.trim() || null, color: color || null });
      setSaveSuccess("Workspace updated");
    } catch (err) {
      setSaveError(err?.response?.data?.error ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteWorkspace(id);
      router.push("/dashboard/workspaces");
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleLeave() {
    try {
      await leaveWorkspace(id);
      router.push("/dashboard/workspaces");
    } catch { /* error in store */ }
  }

  async function handleRoleChange(memberId, newRole) {
    try {
      await updateMemberRole(id, memberId, newRole);
    } catch { /* error in store */ }
  }

  async function handleRemove(memberId) {
    if (!window.confirm("Remove this member from the workspace?")) return;
    try {
      await removeMember(id, memberId);
    } catch { /* error in store */ }
  }

  const canAdmin = myRole === "ADMIN" || myRole === "OWNER";
  const isOwner  = myRole === "OWNER";

  if (!workspace && loading) {
    return (
      <div className={styles.center}>
        <Loader2 size={28} className={styles.spin} />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className={styles.center}>
        <AlertTriangle size={28} />
        <p>Workspace not found.</p>
        <button className="btn btn-ghost" onClick={() => router.push("/dashboard/workspaces")}>
          <ArrowLeft size={15} /> Back
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back link */}
      <button className={styles.backBtn} onClick={() => router.push("/dashboard/workspaces")}>
        <ArrowLeft size={15} /> Workspaces
      </button>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.wsIcon} style={{ background: workspace.color ?? "var(--accent)" }}>
          <Building2 size={22} color="#fff" />
        </div>
        <div>
          <h1 className={styles.pageTitle}>{workspace.name}</h1>
          {workspace.description && (
            <p className={styles.pageDesc}>{workspace.description}</p>
          )}
        </div>
        {canAdmin && (
          <button
            className={`btn btn-ghost ${styles.inviteTopBtn}`}
            onClick={() => { setTab("Invites"); setInviteOpen(true); }}
          >
            <Mail size={15} /> Invite
          </button>
        )}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "General" && <Settings size={14} />}
            {t === "Members" && <Users size={14} />}
            {t === "Invites" && <Mail size={14} />}
            {t}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {tab === "General" && (
        <div className={styles.section}>
          <form onSubmit={handleSave} className={styles.form}>
            <h2 className={styles.sectionTitle}>General settings</h2>

            <label className={styles.label}>
              Name <span className={styles.required}>*</span>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => { setName(e.target.value); setSaveError(""); setSaveSuccess(""); }}
                disabled={!canAdmin}
              />
            </label>
            <label className={styles.label}>
              Description
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={!canAdmin}
              />
            </label>
            <label className={styles.label}>
              Color
              <div className={styles.colorRow}>
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={color || "#6366f1"}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={!canAdmin}
                />
                <span className={styles.colorHex}>{color || "#6366f1"}</span>
              </div>
            </label>

            {saveError   && <p className={styles.formError}>{saveError}</p>}
            {saveSuccess && <p className={styles.formSuccess}>{saveSuccess}</p>}

            {canAdmin && (
              <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 size={14} className={styles.spin} /> Saving…</> : "Save changes"}
                </button>
              </div>
            )}
          </form>

          {/* Danger zone */}
          <div className={styles.dangerZone}>
            <h2 className={styles.dangerTitle}>Danger zone</h2>
            <div className={styles.dangerActions}>
              {!isOwner && (
                <div className={styles.dangerRow}>
                  <div>
                    <div className={styles.dangerLabel}>Leave workspace</div>
                    <div className={styles.dangerHint}>You will lose access to this workspace.</div>
                  </div>
                  <button className={`btn ${styles.dangerBtn}`} onClick={handleLeave}>
                    Leave
                  </button>
                </div>
              )}
              {isOwner && (
                <div className={styles.dangerRow}>
                  <div>
                    <div className={styles.dangerLabel}>Delete workspace</div>
                    <div className={styles.dangerHint}>Permanently delete this workspace and all its data.</div>
                  </div>
                  {confirmDelete ? (
                    <div className={styles.confirmRow}>
                      <span className={styles.confirmText}>Are you sure?</span>
                      <button className={`btn ${styles.dangerBtn}`} onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                    </div>
                  ) : (
                    <button className={`btn ${styles.dangerBtn}`} onClick={() => setConfirmDelete(true)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Members ── */}
      {tab === "Members" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Members ({members.length})</h2>
            {canAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setInviteOpen(true)}>
                <Mail size={14} /> Invite
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.center}><Loader2 size={20} className={styles.spin} /></div>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Member</span>
                <span>Role</span>
                {canAdmin && <span>Actions</span>}
              </div>
              {members.map((m) => {
                const isSelf = m.userId === user?.id || m.user?.id === user?.id;
                const isTargetOwner = m.role === "OWNER";
                return (
                  <div key={m.id} className={styles.tableRow}>
                    <div className={styles.memberInfo}>
                      <div className="u-av" style={{ width: 32, height: 32, fontSize: "0.75rem" }}>
                        {m.user?.avatarUrl
                          ? <img src={m.user.avatarUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                          : (m.user?.name ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.memberName}>{m.user?.name ?? "—"} {isSelf && <span className={styles.you}>(you)</span>}</div>
                        <div className={styles.memberEmail}>{m.user?.email ?? "—"}</div>
                      </div>
                    </div>
                    <div>
                      {canAdmin && !isSelf && !isTargetOwner ? (
                        <select
                          className={styles.roleSelect}
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                          {isOwner && <option value="OWNER">OWNER</option>}
                        </select>
                      ) : (
                        <span className={styles.roleBadge}>{m.role}</span>
                      )}
                    </div>
                    {canAdmin && (
                      <div className={styles.memberActions}>
                        {!isSelf && !isTargetOwner && (
                          <button
                            className={styles.removeBtn}
                            onClick={() => handleRemove(m.id)}
                            title="Remove member"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Invites ── */}
      {tab === "Invites" && canAdmin && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Invites</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setInviteOpen(true)}>
              <Mail size={14} /> Send invite
            </button>
          </div>
          <p className={styles.hint}>Manage pending invites via the Invite modal.</p>
        </div>
      )}

      {/* Invite modal */}
      <InviteModal
        workspaceId={id}
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </div>
  );
}
