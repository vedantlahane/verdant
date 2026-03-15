import Link from "next/link";
import { useState, useEffect } from "react";
import { Github, Sun, Moon, Menu, X } from "lucide-react";
import { Leaf } from "../../playground/components/Leaf";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ThemeMode } from "@/components/ui/useThemeMode";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile nav on escape key
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
          borderBottom: "1px solid var(--border)",
          background: "var(--page-bg)",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <Leaf />
            <span className="font-body text-base lowercase tracking-[0.08em]">
              verdant
            </span>
          </Link>

          <nav className="nav-bar hidden md:flex" aria-label="Main navigation">
            <a href="#features" className="nav-item">
              Docs
            </a>
            <Link href="/playground" className="nav-item">
              Playground
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item nav-item--icon"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={toggle}
              className="nav-item nav-item--icon"
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
          </nav>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 md:hidden"
            style={{ border: "1px solid var(--border)" }}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        className={`mobile-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
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
            { label: "GitHub", href: "https://github.com" },
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
