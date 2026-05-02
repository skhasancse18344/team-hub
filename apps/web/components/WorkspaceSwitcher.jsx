"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Building2, Plus, Check } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import styles from "./WorkspaceSwitcher.module.css";

export default function WorkspaceSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const ref = useRef(null);

  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, loading } =
    useWorkspaceStore();

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
        setNewName("");
        setNameError("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setNameError("Name is required");
      return;
    }
    try {
      await createWorkspace({ name: trimmed });
      setCreating(false);
      setNewName("");
      setNameError("");
      setOpen(false);
    } catch {
      setNameError("Failed to create workspace");
    }
  }

  function selectWorkspace(ws) {
    setActiveWorkspace(ws);
    setOpen(false);
    router.push("/dashboard");
  }

  return (
    <div className={styles.switcher} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 size={16} className={styles.wsIcon} />
        <span className={styles.wsName}>
          {activeWorkspace?.name ?? "No workspace"}
        </span>
        <ChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
      </button>

      {open && (
        <div className={styles.dropdown} role="listbox">
          {workspaces.length === 0 && (
            <p className={styles.empty}>No workspaces yet</p>
          )}
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              className={styles.item}
              role="option"
              aria-selected={ws.id === activeWorkspace?.id}
              onClick={() => selectWorkspace(ws)}
            >
              <Building2 size={14} />
              <span className={styles.itemName}>{ws.name}</span>
              {ws.id === activeWorkspace?.id && <Check size={14} className={styles.check} />}
            </button>
          ))}

          <div className={styles.divider} />

          {creating ? (
            <form onSubmit={handleCreate} className={styles.createForm}>
              <input
                autoFocus
                className={styles.input}
                placeholder="Workspace name"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNameError("");
                }}
              />
              {nameError && <p className={styles.formError}>{nameError}</p>}
              <div className={styles.formActions}>
                <button type="submit" className={styles.createBtn} disabled={loading}>
                  {loading ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setCreating(false);
                    setNewName("");
                    setNameError("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button className={styles.newBtn} onClick={() => setCreating(true)}>
              <Plus size={14} />
              New workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
