"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useThemeMode } from "./ui/useThemeMode";
import { Navbar } from "@/features/landing/components/Navbar";
import { Footer } from "@/features/landing/components/Footer";
import { CodeBlock } from "@/features/landing/components/CodeBlock";

// ── Data ──────────────────────────────────────────

const CODE_LINES = [
  "# My Architecture",
  "theme: moss",
  "",
  "server web-server",
  "database postgres",
  "cache redis",
  "",
  'web-server -> postgres: "queries"',
  'web-server -> redis: "cache reads"',
];

const COMPONENTS = [
  "server", "database", "cache", "gateway", "queue",
  "cloud", "user", "service", "storage", "monitor",
];

const THEMES_LIST = [
  { name: "moss", color: "#52B788" },
  { name: "sage", color: "#84A98C" },
  { name: "fern", color: "#70E000" },
  { name: "bloom", color: "#EC4899" },
  { name: "dusk", color: "#A855F7" },
  { name: "stone", color: "#64748B" },
  { name: "ember", color: "#F59E0B" },
  { name: "frost", color: "#38BDF8" },
];

export function LandingPage() {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");
  const [activeTheme, setActiveTheme] = useState(THEMES_LIST[0]);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--page-bg)", color: "var(--text-primary)" }}
    >
      <Navbar
        themeMode={themeMode}
        resolvedTheme={resolvedTheme as "light" | "dark" ?? "dark"}
        setThemeMode={setThemeMode}
      />

      <main>
        {/* ═══ HERO ═══════════════════════════════ */}
        <section className="pattern-topo">
          <div className="mx-auto max-w-[1200px] px-6 pb-32 pt-24 sm:pt-32 md:pb-40 md:pt-40">
            <p className="section-label mb-6">// where architecture grows</p>

            <h1 className="font-display max-w-[900px] text-6xl leading-[1.05] sm:text-7xl md:text-[6.5rem] lg:text-[8rem]">
              Breathe.
            </h1>

            <p
              className="font-body mt-8 max-w-lg text-lg leading-8"
              style={{ color: "var(--text-secondary)" }}
            >
              Your architecture is{" "}
              <span style={{ color: "var(--accent)" }}>alive</span>. Let it look
              like it.
            </p>

            <div className="btn-group mt-12">
              <Link href="/playground" className="btn-primary group">
                Open Playground
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#features" className="btn-secondary">
                Documentation
              </a>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══════════════════════ */}
        <section className="grid-section">
          <div className="mx-auto max-w-[1200px]">
            <div
              className="px-6 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="section-label">// how it works</span>
            </div>

            <div className="grid-lines md:grid-cols-3">
              {[
                {
                  title: "Write",
                  desc: "Describe your system in plain text. Components, connections, that's it. If you've written a config file, you already know this.",
                },
                {
                  title: "Grow",
                  desc: "Your diagram renders in 3D. Nodes find their place. Edges draw themselves. The system takes shape the moment you describe it.",
                },
                {
                  title: "Explore",
                  desc: "Orbit around your architecture. Zoom into a service. Export a screenshot. Share a link. It's yours.",
                },
              ].map((item) => (
                <div key={item.title} className="px-6 py-10 md:py-14">
                  <h2 className="font-display text-3xl sm:text-4xl">
                    {item.title}
                  </h2>
                  <p
                    className="font-body mt-4 max-w-xs text-sm leading-7"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FEATURES ═══════════════════════════ */}
        <section id="features" className="grid-section">
          <div className="mx-auto max-w-[1200px]">
            <div
              className="px-6 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="section-label">// features</span>
            </div>

            <div className="px-6 py-14 md:py-20">
              <h2 className="font-display max-w-[600px] text-4xl sm:text-5xl md:text-6xl">
                Built to grow with your systems.
              </h2>
            </div>

            <div
              className="grid-lines md:grid-cols-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              {/* Syntax — spans 2 cols */}
              <div className="px-6 py-10 md:col-span-2">
                <p className="section-label mb-4">// syntax</p>
                <h3 className="text-xl font-medium">
                  Syntax you already know
                </h3>
                <p
                  className="font-body mt-3 max-w-md text-sm leading-7"
                  style={{ color: "var(--text-secondary)" }}
                >
                  If you've written a YAML file, a Dockerfile, or a
                  package.json — you can write{" "}
                  <span
                    className="font-mono"
                    style={{ color: "var(--accent)" }}
                  >
                    .vrd
                  </span>{" "}
                  without reading the docs first.
                </p>
                <div className="mt-8 max-w-md">
                  <CodeBlock lines={CODE_LINES.slice(0, 6)} />
                </div>
              </div>

              {/* .vrd files */}
              <div className="px-6 py-10">
                <p className="section-label mb-4">// format</p>
                <h3 className="text-xl font-medium">.vrd files</h3>
                <p
                  className="font-body mt-3 text-sm leading-7"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Plain text. Version controlled. Diffable in every pull
                  request. Your diagrams live next to your code.
                </p>
                <div
                  className="mt-8 p-6 text-center"
                  style={{ border: "1px dotted var(--border-strong)" }}
                >
                  <span
                    className="font-mono text-sm"
                    style={{ color: "var(--accent)" }}
                  >
                    system.vrd
                  </span>
                </div>
              </div>

              {/* Git native */}
              <div className="px-6 py-10">
                <p className="section-label mb-4">// git</p>
                <h3 className="text-xl font-medium">Git native</h3>
                <p
                  className="font-body mt-3 text-sm leading-7"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Every change is a line diff. Review architecture changes the
                  same way you review code.
                </p>
                <div
                  className="mt-8 font-mono text-xs"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div
                    className="px-4 py-2"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      color: "var(--accent)",
                    }}
                  >
                    + cache redis
                  </div>
                  <div
                    className="px-4 py-2"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      color: "var(--accent)",
                    }}
                  >
                    + web → redis
                  </div>
                  <div
                    className="px-4 py-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    &nbsp; theme: moss
                  </div>
                </div>
              </div>
            </div>

            <div className="grid-lines md:grid-cols-4">
              {/* Components */}
              <div className="px-6 py-10">
                <p className="section-label mb-4">// nodes</p>
                <h3 className="text-xl font-medium">10 ready components</h3>
                <p
                  className="font-body mt-3 text-sm leading-7"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Server, database, cache, gateway, queue, cloud, user,
                  service, storage, monitor. The ones you actually use.
                </p>
              </div>

              {/* Themes — spans 2 cols */}
              <div className="px-6 py-10 md:col-span-2">
                <p className="section-label mb-4">// themes</p>
                <h3 className="text-xl font-medium">
                  Themes that set the mood
                </h3>
                <p
                  className="font-body mt-3 max-w-md text-sm leading-7"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Same diagram, different atmosphere. One line in your config,
                  everything shifts.
                </p>

                {/* Theme buttons */}
                <div className="grid-lines mt-6 grid-cols-4 sm:grid-cols-8">
                  {THEMES_LIST.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setActiveTheme(t)}
                      className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                      style={{
                        backgroundColor:
                          activeTheme.name === t.name
                            ? "var(--accent-faint)"
                            : "var(--page-bg)",
                        color:
                          activeTheme.name === t.name
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                      }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                    </button>
                  ))}
                </div>

                {/* Active theme preview */}
                <div
                  className="mt-4 flex items-center gap-4 px-5 py-4"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div
                    className="h-8 w-8"
                    style={{
                      background: `linear-gradient(135deg, ${activeTheme.color}44, ${activeTheme.color})`,
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{activeTheme.name}</p>
                    <p
                      className="font-mono text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      theme: {activeTheme.name}
                    </p>
                  </div>
                  <div className="grid-lines ml-auto grid-cols-4">
                    {[0.3, 0.5, 0.7, 1].map((o) => (
                      <div
                        key={o}
                        className="h-6 w-6"
                        style={{
                          backgroundColor: activeTheme.color,
                          opacity: o,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pattern-hatch hidden min-h-[200px] md:block" />
            </div>

            <div className="grid-lines md:grid-cols-4">
              {/* Zero to 3D */}
              <div className="px-6 py-10 md:col-span-2">
                <p className="section-label mb-4">// quick start</p>
                <h3 className="text-xl font-medium">Zero to 3D in 5 lines</h3>
                <p
                  className="font-body mt-3 max-w-md text-sm leading-7"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No Three.js. No WebGL setup. No build pipeline. Describe what
                  exists. The rest happens.
                </p>
                <div
                  className="mt-8 p-4 font-mono text-sm"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div style={{ color: "var(--text-muted)" }}>
                    $ npx verdant init
                  </div>
                  <div className="mt-1" style={{ color: "var(--accent)" }}>
                    ✓ Ready. Open playground or edit system.vrd
                  </div>
                </div>
              </div>

              {/* Export */}
              <div className="px-6 py-10">
                <p className="section-label mb-4">// export</p>
                <h3 className="text-xl font-medium">Export anything</h3>
                <p
                  className="font-body mt-3 text-sm leading-7"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Screenshot, 3D model, video walkthrough, or a flat SVG.
                  Whatever your team needs.
                </p>
                <div className="grid-lines mt-6 grid-cols-2">
                  {["PNG", "GLB", "MP4", "SVG"].map((f) => (
                    <div
                      key={f}
                      className="px-3 py-2.5 text-center font-mono text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pattern-hatch hidden min-h-[200px] md:block" />
            </div>
          </div>
        </section>

        {/* ═══ COMPONENTS ═════════════════════════ */}
        <section className="grid-section">
          <div className="mx-auto max-w-[1200px]">
            <div
              className="px-6 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="section-label">// components</span>
            </div>

            <div className="px-6 py-14">
              <h2 className="font-display max-w-[500px] text-4xl sm:text-5xl">
                Pieces that fit.
              </h2>
              <p
                className="font-body mt-4 max-w-md text-sm leading-7"
                style={{ color: "var(--text-secondary)" }}
              >
                Pre-built 3D nodes for the infrastructure you actually work
                with. Type the name, it appears.
              </p>
            </div>

            <div
              className="grid-lines grid-cols-2 sm:grid-cols-5"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              {COMPONENTS.map((c) => (
                <div key={c} className="component-cell">
                  <span
                    className="font-mono text-lg"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ◇
                  </span>
                  <span className="component-cell-label">{c}</span>
                </div>
              ))}
            </div>

            <div
              className="px-6 py-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <Link
                href="/playground"
                className="inline-flex items-center gap-2 text-sm"
                style={{ color: "var(--accent)" }}
              >
                Try them in the playground{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ CODE BLOCK ═════════════════════════ */}
        <section className="grid-section">
          <div className="mx-auto max-w-[1200px]">
            <div
              className="px-6 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="section-label">// syntax</span>
            </div>

            <div className="px-6 py-14">
              <h2 className="font-display max-w-[600px] text-4xl sm:text-5xl">
                Where code becomes space.
              </h2>
            </div>

            <div
              className="px-6 py-14"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="mx-auto max-w-2xl">
                <CodeBlock lines={CODE_LINES} />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA ═════════════════════════ */}
        <section
          className="pattern-topo grid-section"
        >
          <div className="mx-auto max-w-[1200px] px-6 py-28 md:py-36">
            <h2 className="font-display max-w-[700px] text-4xl sm:text-5xl md:text-6xl">
              Your systems are{" "}
              <span style={{ color: "var(--accent)" }}>alive</span>.
              <br />
              Let them look like it.
            </h2>
            <div className="mt-12">
              <Link href="/playground" className="btn-primary group">
                Open Playground
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}