"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, Trash2, AlertTriangle, X, Check, Loader2 } from "lucide-react";
import { useProfileStore } from "../../store/useProfileStore";
import { useAuthStore } from "../../store/useAuthStore";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function ProfileClient() {
  const { user, loading, uploading, error, loadProfile, updateProfile, uploadAvatar, removeAvatar, clearError } =
    useProfileStore();
  const { initialize } = useAuthStore();

  const [name,        setName]        = useState("");
  const [nameErr,     setNameErr]     = useState("");
  const [saveOk,      setSaveOk]      = useState(false);
  const [dragOver,    setDragOver]    = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { if (user) setName(user.name ?? ""); }, [user]);

  async function handleSaveName(e) {
    e.preventDefault();
    setNameErr("");
    if (!name.trim()) { setNameErr("Name cannot be empty"); return; }
    try {
      await updateProfile({ name: name.trim() });
      await initialize();
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch { /* error in store */ }
  }

  function validateFile(file) {
    if (!ACCEPTED.includes(file.type)) return "Only JPEG, PNG, WebP or GIF allowed";
    if (file.size > MAX_BYTES)         return "Image must be < 5 MB";
    return null;
  }

  async function handleFile(file) {
    if (!file) return;
    clearError();
    const err = validateFile(file);
    if (err) { useProfileStore.setState({ error: err }); return; }
    await uploadAvatar(file);
    await initialize();
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="profile-page">
      <div className="profile-card" style={{ maxWidth: 580 }}>

        {/* Back link */}
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem", color: "var(--text-2)", marginBottom: 28, transition: "color var(--t2)" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-2)"}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 28 }}>Your Profile</h1>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={clearError} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", display: "flex", alignItems: "center" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* â”€â”€ Avatar section â”€â”€ */}
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 36 }}>
          {/* Clickable avatar */}
          <div
            aria-label="Click or drag to upload avatar"
            role="button" tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            style={{
              position: "relative", width: 120, height: 120, borderRadius: "50%",
              cursor: "pointer", overflow: "hidden",
              border: `2px solid ${dragOver ? "var(--brand)" : "var(--border-2)"}`,
              boxShadow: dragOver ? "0 0 0 4px var(--brand-soft)" : "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          >
            {uploading ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", borderRadius: "50%" }}>
                <div className="spinner" />
              </div>
            ) : user?.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.name ?? "avatar"} width={120} height={120} style={{ objectFit: "cover", borderRadius: "50%" }} priority />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--g-brand)", color: "#fff", fontSize: "2rem", fontWeight: 700, userSelect: "none" }}>
                {initials}
              </div>
            )}
            {/* hover overlay */}
            {!uploading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", transition: "background 0.2s" }}>
                <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 600, opacity: 0, pointerEvents: "none", textAlign: "center", lineHeight: 1.3 }}>
                  {dragOver ? "Drop here" : "Change"}
                </span>
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept={ACCEPTED.join(",")} style={{ display: "none" }}
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading
                ? <><Loader2 size={14} style={{ animation: "spin 0.65s linear infinite", flexShrink: 0 }} /> Uploading...</>
                : <><Camera size={14} /> Upload photo</>}
            </button>
            {user?.avatarUrl && (
              <button className="btn btn-danger btn-sm" onClick={removeAvatar} disabled={uploading || loading}>
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
          <p className="text-xs text-3">JPG, PNG, WebP or GIF · max 5 MB</p>
        </section>

        <hr className="divider" />

        {/* â”€â”€ Profile form â”€â”€ */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20 }}>Personal information</h2>
          <form onSubmit={handleSaveName} style={{ display: "flex", flexDirection: "column", gap: 18 }} noValidate>
            <div className="fgroup">
              <label className="flabel" htmlFor="p-name">Display name</label>
              <input id="p-name" type="text" className={`finput${nameErr ? " err" : ""}`}
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your full name" maxLength={100} autoComplete="name" />
              {nameErr && <span className="ferr">{nameErr}</span>}
            </div>

            <div className="fgroup">
              <label className="flabel" htmlFor="p-email">Email address</label>
              <input id="p-email" type="email" className="finput" value={user?.email ?? ""} readOnly
                style={{ opacity: 0.55, cursor: "not-allowed" }} aria-describedby="email-note" />
              <span id="email-note" className="fhint">Email cannot be changed here.</span>
            </div>

            {user?.createdAt && (
              <div className="fgroup">
                <label className="flabel">Member since</label>
                <p style={{ fontSize: "0.9375rem", color: "var(--text-2)", padding: "4px 0" }}>
                  {new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
              <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
                {loading
                  ? <><Loader2 size={14} style={{ animation: "spin 0.65s linear infinite", flexShrink: 0 }} /> Saving...</>
                  : "Save changes"}
              </button>
              {saveOk && (
                <span className="badge badge-emerald" style={{ fontSize: "0.8125rem" }}><Check size={12} /> Saved!</span>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}


