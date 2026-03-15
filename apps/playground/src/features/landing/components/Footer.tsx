"use client";

import Link from "next/link";
import { Leaf } from "../../shared/ui/Leaf";
import { useAccentTheme } from "../../shared/hooks/useAccentTheme";
import { ThemeInkSelector } from "../../shared/ui/ThemeInkSelector";
import { THEMES_LIST } from "../constants";

export function Footer() {
  const { activeTheme, setActiveTheme, mounted } = useAccentTheme();

  return (
    <footer className="grid-section">
      <div className="frame-grid">
        <div className="frame-gutter border-r border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
        </div>

        <div className="flex flex-col h-full">
          <div className="grid-lines md:grid-cols-4 bg-[var(--page-bg)]">
            <div className="px-6 py-12">
              <div className="group inline-flex items-center gap-2.5">
                <Leaf className="h-5 w-5" />
                <span className="font-body text-base lowercase tracking-[0.08em] text-[color:var(--text-primary)]">
                  verdant
                </span>
              </div>
              <p className="font-body mt-4 max-w-xs text-sm leading-7 text-[color:var(--text-secondary)]">
                Where architecture grows.
              </p>
            </div>

            <div className="px-6 py-12">
              <p className="section-label mb-6">// product</p>
              <nav className="flex flex-col gap-3">
                <Link href="/playground" className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
                  Playground
                </Link>
                <a href="#features" className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
                  Documentation
                </a>
              </nav>
            </div>

            <div className="px-6 py-12">
              <p className="section-label mb-6">// community</p>
              <nav className="flex flex-col gap-3">
                <a href="https://github.com" className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
                  GitHub
                </a>
              </nav>
            </div>

            {/* Global Theme Selector in Footer */}
            <div className="px-6 py-12 border-l border-[var(--border)] md:border-l-0">
              <p className="section-label mb-6">// global theme</p>
              <ThemeInkSelector 
                activeTheme={activeTheme} 
                onSelect={setActiveTheme} 
                mounted={mounted} 
                columns={4} 
              />
              <p className="font-mono text-[10px] mt-4 text-[color:var(--text-muted)] uppercase tracking-widest">
                Ink: {mounted ? activeTheme.name : THEMES_LIST[0].name}
              </p>
            </div>
          </div>

          <div className="px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-[var(--border)] bg-[var(--page-bg)]">
            <p className="font-mono text-xs text-[color:var(--text-muted)]">
              © {new Date().getFullYear()} Verdant. Built for architects.
            </p>
          </div>
        </div>

        <div className="frame-gutter border-l border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
        </div>
      </div>
    </footer>
  );
}