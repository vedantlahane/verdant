"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Github, Sun, Moon, Menu, X } from "lucide-react";
import { Leaf } from "../../shared/ui/Leaf";
import { ThemeToggle } from "@/features/shared/ui/ThemeToggle";
import { ThemeMode } from "@/features/shared/ui/useThemeMode";
import { LeafRain } from "@/features/shared/ui/LeafRain";

interface NavbarProps {
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setThemeMode: (m: ThemeMode) => void;
}

export function Navbar({
  themeMode,
  resolvedTheme,
  setThemeMode,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggle = () =>
    setThemeMode(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{
          borderBottom: "1px solid var(--border-strong)",
          background: "var(--page-bg)",
        }}
      >
        <div className="frame-grid">
          {/* Left gutter border */}
          <div
            className="frame-gutter border-r"
            style={{ borderColor: "var(--border)" }}
          />

          {/* Center */}
          <div className="flex h-14 items-center justify-between px-5 md:px-8">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5"
            >
              <Leaf />
              <span className="font-body text-xl lowercase tracking-[0.08em]">
                verdant
              </span>
            </Link>

            {/* Desktop nav */}
            <nav
              className="nav-bar hidden md:flex h-9"
              aria-label="Main navigation"
            >
              <LeafRain className="nav-item">
                <a href="#features" className="btn-content">
                  Docs
                </a>
              </LeafRain>

              <LeafRain className="nav-item">
                <Link href="/playground" className="btn-content">
                  Playground
                </Link>
              </LeafRain>

              <LeafRain className="nav-item nav-item--icon">
                <a
                  href="https://github.com/vedantlahane/verdant"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-content"
                  aria-label="GitHub"
                >
                  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--primary-color)]" fill="currentColor" aria-hidden="true">
                    <title>GitHub</title>
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                </a>
              </LeafRain>

              <LeafRain className="nav-item nav-item--icon">
                <button
                  type="button"
                  onClick={toggle}
                  className="btn-content"
                  aria-label="Toggle theme"
                >
                  {mounted ? (
                    resolvedTheme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )
                  ) : (
                    <span className="inline-block h-4 w-4" />
                  )}
                </button>
              </LeafRain>
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-2 md:hidden"
              style={{ border: "1px solid var(--border)" }}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          {/* Right gutter border */}
          <div
            className="frame-gutter border-l"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      <div
        className={`mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile sheet ── */}
      <aside
        id="mobile-menu"
        className={`mobile-sheet ${mobileOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
        role="dialog"
        aria-modal={mobileOpen}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="section-label">// menu</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-2"
            style={{ border: "1px solid var(--border)" }}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col">
          {[
            { label: "Documentation", href: "#features" },
            { label: "Playground", href: "/playground" },
            { label: "GitHub", href: "https://github.com/vedantlahane/verdant" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="mobile-nav-item"
              {...(item.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div
          className="mt-auto p-6"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <ThemeToggle mode={themeMode} onChange={setThemeMode} />
        </div>
      </aside>
    </>
  );
}