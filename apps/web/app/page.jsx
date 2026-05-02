import Link from "next/link";
import Footer from "../components/Footer";

/* ── SVG icon helpers ──────────────────────────────────────────────── */
function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 3 }}>
      <path d="M2.5 7L5.5 10L11.5 4" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Features data ─────────────────────────────────────────────────── */
const features = [
  { icon: "🎯", cls: "fi-brand",   title: "Goal Tracking",        desc: "Set OKRs, KPIs, or custom goals. Break them into milestones and track progress in real time." },
  { icon: "🏢", cls: "fi-cyan",    title: "Team Workspaces",      desc: "Separate spaces for each team or project. Keep work organised and context-switched in seconds." },
  { icon: "⚡", cls: "fi-emerald", title: "Real-time Updates",    desc: "Live notifications and activity feeds keep everyone on the same page without endless meetings." },
  { icon: "📣", cls: "fi-amber",   title: "Announcements",        desc: "Broadcast important updates across your org. React, comment, and keep the conversation going." },
  { icon: "🔐", cls: "fi-violet",  title: "Role-based Access",    desc: "Owners, Admins, and Members. Fine-grained control so the right people see the right things." },
  { icon: "📊", cls: "fi-rose",    title: "Progress Insights",    desc: "Beautiful dashboards that show where you are vs. where you need to be. No spreadsheets required." },
];

/* ── Testimonials ──────────────────────────────────────────────────── */
const testimonials = [
  { stars: "★★★★★", text: "TeamHub completely transformed how our engineering org aligns on quarterly goals. We actually ship faster now.", name: "Sarah K.", role: "VP Engineering · Acme Inc", grad: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
  { stars: "★★★★★", text: "Finally, a tool that doesn't get in the way. The milestone tracking alone saved us hours of status meetings every week.", name: "James R.", role: "Product Lead · StartupXYZ", grad: "linear-gradient(135deg,#06b6d4,#6366f1)" },
  { stars: "★★★★★", text: "We went from Notion + spreadsheets + Slack to just TeamHub. The team is happier, goals are clearer, results improved.", name: "Priya M.", role: "CEO · GrowthCo", grad: "linear-gradient(135deg,#f59e0b,#ec4899)" },
];

/* ── Pricing plans ─────────────────────────────────────────────────── */
const plans = [
  {
    name: "Starter", price: "Free", period: "", badge: null,
    desc: "Perfect for small teams getting started.",
    features: ["Up to 5 members", "2 workspaces", "Basic goal tracking", "Community support"],
    cta: "Get started free", primary: false,
  },
  {
    name: "Pro", price: "$12", period: "/mo per seat", badge: "Most Popular",
    desc: "Everything you need to run a high-performing team.",
    features: ["Unlimited members", "Unlimited workspaces", "Advanced analytics", "Priority support", "Custom roles", "Slack & GitHub integrations"],
    cta: "Start free trial", primary: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "", badge: null,
    desc: "Tailored for large organizations.",
    features: ["SSO / SAML", "Audit logs", "SLA guarantees", "Dedicated CSM", "Custom integrations", "On-premise option"],
    cta: "Contact sales", primary: false,
  },
];

/* ══════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg-glow" />
        <div className="hero-grid" />
        <div className="hero-orb-1" />
        <div className="hero-orb-2" />

        {/* Eyebrow */}
        <div className="hero-eyebrow fade-up">
          <span className="badge badge-brand">
            ✨ Announcing TeamHub v2.0 – Now with AI-powered insights
          </span>
        </div>

        {/* Title */}
        <h1 className="hero-title fade-up-1">
          Collaborate Smarter,{" "}
          <span className="gt">Achieve More</span>
          <br />Together
        </h1>

        {/* Description */}
        <p className="hero-desc fade-up-2">
          The all-in-one workspace for modern teams. Set goals, track milestones,
          ship announcements, and celebrate wins — all in one beautiful place.
        </p>

        {/* CTAs */}
        <div className="hero-actions fade-up-3">
          <Link href="/signup" className="btn btn-primary btn-xl">
            Start for free →
          </Link>
          <Link href="#how-it-works" className="btn btn-secondary btn-xl">
            ▶ See how it works
          </Link>
        </div>

        {/* Social proof */}
        <div className="hero-proof fade-up-4">
          <div className="avatar-stack">
            {["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"].map((c, i) => (
              <div key={i} className="av" style={{ background: c }}>
                {["AK", "JS", "MR", "PL", "TW"][i]}
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text)" }}>12,000+</strong> teams already on TeamHub
          </p>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 24px 80px" }}>
        <div className="stats-bar">
          {[
            { n: "12K+",   l: "Teams worldwide" },
            { n: "98%",    l: "Customer satisfaction" },
            { n: "3.2M+",  l: "Goals tracked" },
            { n: "99.9%",  l: "Uptime SLA" },
          ].map((s) => (
            <div key={s.n} className="stat-item">
              <div className="stat-num">{s.n}</div>
              <div className="stat-lbl">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Features ──────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "0 0 100px" }}>
        <div className="section">
          <div className="section-header">
            <div className="section-eyebrow">
              <span className="badge badge-brand">Features</span>
            </div>
            <h2 className="section-title">
              Everything your team needs to <span className="gt">excel</span>
            </h2>
            <p className="section-desc">
              From goal setting to real-time collaboration, TeamHub gives your team
              the tools to move fast and stay aligned.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className={`fi ${f.cls}`}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "0 0 100px", borderTop: "1px solid var(--border)" }}>
        <div className="section">
          <div className="section-header">
            <div className="section-eyebrow">
              <span className="badge badge-emerald">How it works</span>
            </div>
            <h2 className="section-title">Up and running in <span className="gt">3 minutes</span></h2>
            <p className="section-desc">No onboarding call needed. Just sign up and start collaborating.</p>
          </div>

          <div className="steps-grid">
            {[
              { n: "1", title: "Create your workspace", desc: "Sign up free and create a workspace for your team or project in seconds. No credit card required." },
              { n: "2", title: "Invite your team",       desc: "Send invite links to teammates. Assign roles and permissions to control who sees what." },
              { n: "3", title: "Set goals & ship",       desc: "Break big goals into milestones and action items. Track progress together and celebrate wins." },
            ].map((s) => (
              <div key={s.n} className="step-card">
                <div className="step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 100px", borderTop: "1px solid var(--border)" }}>
        <div className="section">
          <div className="section-header">
            <div className="section-eyebrow">
              <span className="badge badge-amber">Testimonials</span>
            </div>
            <h2 className="section-title">Loved by teams <span className="gt">everywhere</span></h2>
            <p className="section-desc">Don't take our word for it – here's what real teams have to say.</p>
          </div>

          <div className="testi-grid">
            {testimonials.map((t) => (
              <div key={t.name} className="testi-card">
                <div className="testi-stars">{t.stars}</div>
                <p className="testi-text">"{t.text}"</p>
                <div className="testi-author">
                  <div className="testi-av" style={{ background: t.grad }}>
                    {t.name.split(" ").map((w) => w[0]).join("")}
                  </div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "0 0 100px", borderTop: "1px solid var(--border)" }}>
        <div className="section">
          <div className="section-header">
            <div className="section-eyebrow">
              <span className="badge badge-cyan">Pricing</span>
            </div>
            <h2 className="section-title">Simple, <span className="gt">transparent</span> pricing</h2>
            <p className="section-desc">Start free, scale as you grow. No hidden fees, no surprises.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {plans.map((p) => (
              <div
                key={p.name}
                style={{
                  padding: "32px",
                  background: p.primary ? "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))" : "var(--surface)",
                  border: p.primary ? "1px solid rgba(99,102,241,0.35)" : "1px solid var(--border)",
                  borderRadius: "var(--r-xl)",
                  display: "flex", flexDirection: "column",
                  boxShadow: p.primary ? "0 0 40px rgba(99,102,241,0.15)" : "none",
                  position: "relative", overflow: "hidden",
                }}
              >
                {p.badge && (
                  <div style={{ position: "absolute", top: 20, right: 20 }}>
                    <span className="badge badge-brand">{p.badge}</span>
                  </div>
                )}
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: 8 }}>{p.name}</h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{p.price}</span>
                  {p.period && <span style={{ fontSize: "0.875rem", color: "var(--text-2)" }}>{p.period}</span>}
                </div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-2)", marginBottom: 24, lineHeight: 1.6 }}>{p.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, flex: 1 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: "0.9rem", color: "var(--text-2)" }}>
                      <Check /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.primary ? "/signup" : p.name === "Enterprise" ? "#" : "/signup"}
                  className={`btn w-full ${p.primary ? "btn-primary" : "btn-secondary"}`}
                  style={{ textAlign: "center" }}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA banner ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", padding: "0 24px 100px" }}>
        <div className="cta-section">
          <h2>Ready to level up your team?</h2>
          <p>Join 12,000+ teams that use TeamHub to set goals, track milestones, and ship faster. Free to start — no card needed.</p>
          <div className="cta-btns">
            <Link href="/signup" className="btn btn-primary btn-xl">Create free account</Link>
            <Link href="/login"  className="btn btn-secondary btn-xl">Sign in</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}