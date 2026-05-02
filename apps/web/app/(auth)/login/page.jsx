"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Rocket, AlertTriangle, Loader2 } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";

/* ── Decorative feature list ── */
const perks = [
  { icon: "🎯", text: "Set & track goals with your entire team" },
  { icon: "⚡", text: "Real-time updates — no more status meetings" },
  { icon: "🔐", text: "Enterprise-grade security built in" },
  { icon: "📊", text: "Beautiful dashboards that keep everyone aligned" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, isAuthenticated, clearError } = useAuthStore();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [fieldErr, setFieldErr] = useState({});

  // If already logged in, go to dashboard
  useEffect(() => { if (isAuthenticated) router.replace("/dashboard"); }, [isAuthenticated, router]);
  useEffect(() => { return () => clearError(); }, [clearError]);

  function validate() {
    const errs = {};
    if (!email.trim())                      errs.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))  errs.email    = "Enter a valid email";
    if (!password)                          errs.password = "Password is required";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErr(errs); return; }
    setFieldErr({});
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch { /* error shown from store */ }
  }

  return (
    <div className="auth-page">

      {/* ── Left decorative panel ── */}
      <div className="auth-left">
        <div className="auth-left-glow" />
        <div className="auth-left-grid" />

        <div style={{ position: "relative", maxWidth: 440 }}>
          {/* Logo */}
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 48, fontWeight: 700, fontSize: "1.0625rem", color: "var(--text)" }}>
            <div style={{ width: 32, height: 32, background: "var(--g-brand)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Rocket size={15} style={{ color: "#fff" }} /></div>
            TeamHub
          </Link>

          <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 16, lineHeight: 1.2 }}>
            Welcome back to <span className="gt">your team</span>
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: "0.9375rem", marginBottom: 40, lineHeight: 1.7 }}>
            Sign in to continue collaborating, tracking goals, and shipping great work with your team.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {perks.map((p) => (
              <div key={p.text} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, background: "var(--surface-2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0, border: "1px solid var(--border-2)" }}>
                  {p.icon}
                </div>
                <span style={{ fontSize: "0.9375rem", color: "var(--text-2)" }}>{p.text}</span>
              </div>
            ))}
          </div>

          {/* decorative glow orb */}
          <div style={{ position: "absolute", width: 300, height: 300, top: "50%", left: "50%", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)", pointerEvents: "none", zIndex: -1 }} />
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-right">
        <div className="auth-box">
          {/* Logo (shown when left panel is hidden on mobile) */}
          <div className="auth-logo">
            <div className="auth-logo-icon"><Rocket size={14} style={{ color: "#fff" }} /></div>
            <span style={{ fontWeight: 700 }}>TeamHub</span>
          </div>

          <div className="auth-header">
            <h1>Sign in</h1>
            <p>Enter your credentials to access your dashboard.</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="fgroup">
              <label className="flabel" htmlFor="email">Email address</label>
              <input
                id="email" type="email" className={`finput${fieldErr.email ? " err" : ""}`}
                placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" autoFocus
              />
              {fieldErr.email && <span className="ferr">{fieldErr.email}</span>}
            </div>

            {/* Password */}
            <div className="fgroup">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="flabel" htmlFor="password">Password</label>
                <a href="#" style={{ fontSize: "0.8125rem", color: "var(--brand-light)" }}>Forgot password?</a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password" type={showPw ? "text" : "password"}
                  className={`finput${fieldErr.password ? " err" : ""}`}
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: "1rem", padding: 2 }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErr.password && <span className="ferr">{fieldErr.password}</span>}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><Loader2 size={14} style={{ animation: "spin 0.65s linear infinite", flexShrink: 0 }} /> Signing in...</> : "Sign in \u2192"}
            </button>
          </form>

          <div className="auth-sep" style={{ margin: "24px 0" }}>
            <span>or continue with</span>
          </div>

          {/* OAuth placeholders */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "G", label: "Google",  bg: "#4285F4" },
              { icon: "⌥", label: "GitHub",  bg: "#333" },
            ].map((o) => (
              <button key={o.label} type="button" className="btn btn-secondary"
                style={{ gap: 8, opacity: 0.7, cursor: "not-allowed" }} disabled title="Coming soon">
                <span style={{ fontWeight: 800, color: o.bg }}>{o.icon}</span>
                {o.label}
              </button>
            ))}
          </div>

          <p className="auth-footer">
            Don't have an account?{" "}
            <Link href="/signup">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
