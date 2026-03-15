import Link from "next/link";
import { Leaf } from "../../playground/components/Leaf";

export function Footer() {
  return (
    <footer className="grid-section">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid-lines md:grid-cols-3">
          {/* Brand */}
          <div className="px-6 py-10">
            <div className="group inline-flex items-center gap-2.5">
              <Leaf />
              <span className="font-body text-base lowercase tracking-[0.08em]">
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

          <div className="px-6 py-10">
            <p className="section-label mb-4">// links</p>
            <nav className="flex flex-col gap-2">
              <Link
                href="/playground"
                className="text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--accent)]"
              >
                Playground
              </Link>
              <a
                href="#features"
                className="text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--accent)]"
              >
                Documentation
              </a>
              <a
                href="https://github.com"
                className="text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--accent)]"
              >
                GitHub
              </a>
            </nav>
          </div>

          <div className="px-6 py-10">
            <p className="section-label mb-4">// status</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-[color:var(--text-primary)]">
                All systems functional
              </span>
            </div>
          </div>
        </div>

        <div
          className="px-6 py-8 text-center"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-xs text-[color:var(--text-muted)]">
            © {new Date().getFullYear()} Verdant. Built for architects.
          </p>
        </div>
      </div>
    </footer>
  );
}
