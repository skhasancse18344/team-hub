"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Users, Target, Plus, ArrowRight, Loader2 } from "lucide-react";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";
import styles from "./workspaces.module.css";

export default function WorkspacesPage() {
  const router = useRouter();
  const { workspaces, loading, error, fetchWorkspaces, createWorkspace, setActiveWorkspace } =
    useWorkspaceStore();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setFormError("Name is required"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const ws = await createWorkspace({ name: trimmed, description: description.trim() || undefined });
      setShowForm(false);
      setName("");
      setDescription("");
      router.push(`/dashboard/workspaces/${ws.id}`);
    } catch (err) {
      setFormError(err?.response?.data?.error ?? "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  }

  function openWorkspace(ws) {
    setActiveWorkspace(ws);
    router.push(`/dashboard/workspaces/${ws.id}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Workspaces</h1>
          <p className={styles.subtitle}>Manage your teams and projects</p>
        </div>
        <button className={`btn btn-primary ${styles.newBtn}`} onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          New workspace
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Create workspace</h2>
          <form onSubmit={handleCreate} className={styles.form}>
            <label className={styles.label}>
              Name <span className={styles.required}>*</span>
              <input
                className={styles.input}
                placeholder="e.g. Engineering"
                value={name}
                onChange={(e) => { setName(e.target.value); setFormError(""); }}
                autoFocus
              />
            </label>
            <label className={styles.label}>
              Description
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                placeholder="What is this workspace for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>
            {formError && <p className={styles.formError}>{formError}</p>}
            <div className={styles.formActions}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><Loader2 size={15} className={styles.spin} /> Creating…</> : "Create"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowForm(false); setName(""); setDescription(""); setFormError(""); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && workspaces.length === 0 ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spin} />
          <span>Loading workspaces…</span>
        </div>
      ) : workspaces.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} className={styles.emptyIcon} />
          <h2>No workspaces yet</h2>
          <p>Create your first workspace to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create workspace
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {workspaces.map((ws) => (
            <div key={ws.id} className={styles.card} onClick={() => openWorkspace(ws)}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} style={{ background: ws.color ?? "var(--accent)" }}>
                  <Building2 size={18} color="#fff" />
                </div>
                <span className={styles.roleChip}>{ws.myRole}</span>
              </div>
              <h2 className={styles.cardName}>{ws.name}</h2>
              {ws.description && <p className={styles.cardDesc}>{ws.description}</p>}
              <div className={styles.cardMeta}>
                <span className={styles.metaItem}><Users size={13} /> {ws._count?.members ?? 0} members</span>
                <span className={styles.metaItem}><Target size={13} /> {ws._count?.goals ?? 0} goals</span>
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.openLink}>Open <ArrowRight size={13} /></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
