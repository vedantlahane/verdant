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
                  <Github className="h-4 w-4" />
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