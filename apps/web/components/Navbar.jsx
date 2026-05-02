"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon, Rocket } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";

// Routes where Navbar should not render
const HIDDEN_ROUTES = ["/login", "/signup"];
const HIDE_PREFIX   = ["/dashboard"];

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  const { user, isAuthenticated, initialized, initialize, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide on dashboard / auth pages
  if (HIDDEN_ROUTES.includes(pathname)) return null;
  if (HIDE_PREFIX.some((p) => pathname?.startsWith(p))) return null;

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
      <div className="nav-inner">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon"><Rocket size={16} /></div>
          <span>TeamHub</span>
        </Link>

        {/* Desktop nav links */}
        <ul className="nav-links">
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#how-it-works">How it works</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
        </ul>

        {/* Actions */}
        <div className="nav-actions">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon theme-toggle"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{ position: "relative" }}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            <span className="theme-toggle-label">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>
          {initialized ? (
            isAuthenticated ? (
              <>
                <Link href="/dashboard" className="btn btn-secondary btn-sm">Dashboard</Link>
                <div
                  className="u-av"
                  style={{ width: 36, height: 36, fontSize: "0.8rem" }}
                  title={user?.name ?? "Profile"}
                  onClick={() => router.push("/profile")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && router.push("/profile")}
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : initials}
                </div>
              </>
            ) : (
              <>
                <Link href="/login"  className="btn btn-ghost btn-sm">Log in</Link>
                <Link href="/signup" className="btn btn-primary btn-sm">Get started →</Link>
              </>
            )
          ) : (
            <div style={{ width: 120 }} />  /* placeholder to prevent CLS */
          )}
        </div>
      </div>
    </nav>
  );
}
