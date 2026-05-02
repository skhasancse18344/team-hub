"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Rocket, Loader2 } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";

export default function SignupPage() {
  const router = useRouter();
  const { register, loading, error, isAuthenticated, clearError } = useAuthStore();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [agreed,   setAgreed]   = useState(false);
  const [fieldErr, setFieldErr] = useState({});

  useEffect(() => { if (isAuthenticated) router.replace("/dashboard"); }, [isAuthenticated, router]);
  useEffect(() => { return () => clearError(); }, [clearError]);

  const pwStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8)              score++;
    if (/[A-Z]/.test(password))            score++;
    if (/[0-9]/.test(password))            score++;
    if (/[^A-Za-z0-9]/.test(password))    score++;
    return score; // 0-4
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][pwStrength];
  const strengthColor = ["", "#f87171", "#fbbf24", "#34d399", "#10b981"][pwStrength];

  function validate() {
    const errs = {};
    if (!name.trim())                        errs.name     = "Name is required";
    if (!email.trim())                       errs.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))   errs.email    = "Enter a valid email";
    if (!password)                           errs.password = "Password is required";
    else if (password.length < 8)           errs.password = "Minimum 8 characters";
    if (!agreed)                             errs.agreed   = "You must accept the terms";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErr(errs); return; }
    setFieldErr({});
    try {
      await register(name.trim(), email, password);
      router.push("/dashboard");
    } catch { /* error from store */ }
  }

  return (
    <div className="auth-page">

      {/* ── Left decorative panel ── */}
      <div className="auth-left">
        <div className="auth-left-glow" />
        <div className="auth-left-grid" />

        <div style={{ position: "relative", maxWidth: 440 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 48, fontWeight: 700, fontSize: "1.0625rem", color: "var(--text)" }}>
            <div style={{ width: 32, height: 32, background: "var(--g-brand)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Rocket size={15} style={{ color: "#fff" }} /></div>
            TeamHub
          </Link>

          <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 16, lineHeight: 1.2 }}>
            Start your team's <span className="gt">success story</span>
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: "0.9375rem", marginBottom: 40, lineHeight: 1.7 }}>
            Join 12,000+ high-performing teams. Set up your workspace in minutes — free forever for small teams.
          </p>

          {/* Trust badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "✅", text: "Free forever for teams up to 5 members" },
              { icon: "🔒", text: "Your data is encrypted end-to-end" },
              { icon: "🚫", text: "No credit card required to start" },
              { icon: "🔄", text: "Cancel or downgrade at any time" },
            ].map((t) => (
              <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.9rem", color: "var(--text-2)" }}>
                <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                {t.text}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48, padding: "24px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", fontWeight: 700, color: "#fff" }}>SP</div>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Sarah P.</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>CTO · Acme Corp</div>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.65 }}>
              "TeamHub cut our weekly status meetings by 80%. We're now fully async and shipping faster than ever."
            </p>
            <div style={{ color: "#fbbf24", marginTop: 10, fontSize: "0.8rem", letterSpacing: 2 }}>★★★★★</div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-right">
        <div className="auth-box">
          <div className="auth-logo">
            <div className="auth-logo-icon">🚀</div>
            <span style={{ fontWeight: 700 }}>TeamHub</span>
          </div>

          <div className="auth-header">
            <h1>Create your account</h1>
            <p>Free forever for small teams. No card needed.</p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="fgroup">
              <label className="flabel" htmlFor="name">Full name</label>
              <input
                id="name" type="text" className={`finput${fieldErr.name ? " err" : ""}`}
                placeholder="Jane Smith"
                value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name" autoFocus
              />
              {fieldErr.name && <span className="ferr">{fieldErr.name}</span>}
            </div>

            {/* Email */}
            <div className="fgroup">
              <label className="flabel" htmlFor="email">Work email</label>
              <input
                id="email" type="email" className={`finput${fieldErr.email ? " err" : ""}`}
                placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {fieldErr.email && <span className="ferr">{fieldErr.email}</span>}
            </div>

            {/* Password */}
            <div className="fgroup">
              <label className="flabel" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password" type={showPw ? "text" : "password"}
                  className={`finput${fieldErr.password ? " err" : ""}`}
                  placeholder="Min. 8 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: "1rem", padding: 2 }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErr.password && <span className="ferr">{fieldErr.password}</span>}

              {/* Password strength meter */}
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map((i) => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= pwStrength ? strengthColor : "var(--border-2)", transition: "background 0.2s" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "0.78125rem", color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Terms */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input
                type="checkbox" id="terms"
                checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 3, accentColor: "var(--brand)", cursor: "pointer", width: 16, height: 16, flexShrink: 0 }}
              />
              <label htmlFor="terms" style={{ fontSize: "0.875rem", color: "var(--text-2)", cursor: "pointer", lineHeight: 1.5 }}>
                I agree to the{" "}
                <Link href="/terms" style={{ color: "var(--brand-light)" }}>Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" style={{ color: "var(--brand-light)" }}>Privacy Policy</Link>
              </label>
            </div>
            {fieldErr.agreed && <span className="ferr" style={{ marginTop: -10 }}>{fieldErr.agreed}</span>}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <><Loader2 size={14} style={{ animation: "spin 0.65s linear infinite", flexShrink: 0 }} /> Creating account...</> : "Create free account →"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{" "}
            <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
