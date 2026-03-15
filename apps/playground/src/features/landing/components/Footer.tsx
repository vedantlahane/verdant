import Link from "next/link";
import { Leaf } from "../../shared/ui/Leaf";

export function Footer() {
  return (
    <footer className="grid-section">
      <div className="frame-grid">
        {/* ═══ Left Gutter ═══ */}
        <div className="frame-gutter border-r border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
        </div>

        {/* ═══ Center Content ═══ */}
        <div className="flex flex-col h-full">
          <div className="grid-lines md:grid-cols-3 bg-[var(--page-bg)]">
            {/* Brand */}
            <div className="px-6 py-12">
              <div className="group inline-flex items-center gap-2.5">
                <Leaf className="h-5 w-5" />
                <span 
                  className="font-body text-base lowercase tracking-[0.08em]"
                  style={{ color: "var(--text-primary)" }}
                >
                  verdant
                </span>
              </div>
              <p
                className="font-body mt-4 max-w-xs text-sm leading-7"
                style={{ color: "var(--text-secondary)" }}
              >
                Where architecture grows.
              </p>
            </div>

            {/* Product */}
            <div className="px-6 py-12">
              <p className="section-label mb-6">// product</p>
              <nav className="flex flex-col gap-3">
                <Link
                  href="/playground"
                  className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  Playground
                </Link>
                <a
                  href="#features"
                  className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  Documentation
                </a>
                <a
                  href="#components"
                  className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  Components
                </a>
                <a
                  href="#themes"
                  className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  Themes
                </a>
              </nav>
            </div>

            {/* Community */}
            <div className="px-6 py-12">
              <p className="section-label mb-6">// community</p>
              <nav className="flex flex-col gap-3">
                <a
                  href="https://github.com"
                  className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  GitHub
                </a>
                <a
                  href="#"
                  className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  Discord
                </a>
                <a
                  href="#"
                  className="font-ui text-sm font-medium transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                >
                  X
                </a>
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-[var(--border)] bg-[var(--page-bg)]"
          >
            <p className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              © {new Date().getFullYear()} Verdant. Built for architects.
            </p>
            <div className="flex gap-4 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              <a href="#" className="hover:text-[color:var(--accent)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[color:var(--accent)] transition-colors">Terms</a>
            </div>
          </div>
        </div>

        {/* ═══ Right Gutter ═══ */}
        <div className="frame-gutter border-l border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
        </div>
      </div>
    </footer>
  );
}