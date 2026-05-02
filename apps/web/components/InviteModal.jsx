"use client";
import { useState, useEffect } from "react";
import { X, Mail, UserCog, Send, Trash2, Loader2 } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import styles from "./InviteModal.module.css";

const ROLES = ["MEMBER", "ADMIN"];

export default function InviteModal({ workspaceId, isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const { invites, fetchInvites, inviteMember, revokeInvite, loading } =
    useWorkspaceStore();

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchInvites(workspaceId);
    }
  }, [isOpen, workspaceId]);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setRole("MEMBER");
      setFormError("");
      setSuccess("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setFormError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormError("Enter a valid email address");
      return;
    }
    setFormError("");
    setSuccess("");
    try {
      await inviteMember(workspaceId, { email: trimmed, role });
      setEmail("");
      setRole("MEMBER");
      setSuccess(`Invite sent to ${trimmed}`);
    } catch (err) {
      setFormError(err?.response?.data?.error ?? "Failed to send invite");
    }
  }

  async function handleRevoke(inviteId) {
    try {
      await revokeInvite(workspaceId, inviteId);
    } catch {
      // error is stored in store
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Invite members"
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Invite members</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Invite form */}
        <form onSubmit={handleSend} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.inputWrap}>
              <Mail size={15} className={styles.inputIcon} />
              <input
                type="email"
                className={styles.input}
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError("");
                  setSuccess("");
                }}
                autoFocus
              />
            </div>
            <div className={styles.selectWrap}>
              <UserCog size={15} className={styles.inputIcon} />
              <select
                className={styles.select}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={loading}
            >
              {loading ? <Loader2 size={15} className={styles.spin} /> : <Send size={15} />}
              Send
            </button>
          </div>
          {formError && <p className={styles.error}>{formError}</p>}
          {success && <p className={styles.success}>{success}</p>}
        </form>

        {/* Pending invites list */}
        <div className={styles.invitesList}>
          <h3 className={styles.sectionTitle}>Pending invites</h3>
          {invites.length === 0 ? (
            <p className={styles.empty}>No pending invites</p>
          ) : (
            <ul className={styles.list}>
              {invites.map((inv) => (
                <li key={inv.id} className={styles.inviteItem}>
                  <div className={styles.inviteInfo}>
                    <span className={styles.inviteEmail}>{inv.email}</span>
                    <span className={styles.inviteRole}>{inv.role}</span>
                  </div>
                  <button
                    className={styles.revokeBtn}
                    onClick={() => handleRevoke(inv.id)}
                    aria-label={`Revoke invite for ${inv.email}`}
                    disabled={loading}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
