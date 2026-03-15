"use client";

import { useState, useEffect } from "react";
import { CodeBlock } from "./CodeBlock";
import { CODE_LINES, THEMES_LIST } from "../constants";

// Helper component for the drafting crosshairs
function CadCrosshairs() {
  return (
    <>
      <div className="cad-crosshair cad-tl" />
      <div className="cad-crosshair cad-tr" />
      <div className="cad-crosshair cad-bl" />
      <div className="cad-crosshair cad-br" />
    </>
  );
}

export function Features() {
  const [activeTheme, setActiveTheme] = useState(THEMES_LIST[0]);

  // LIVE THEME SWITCHING: Globally update CSS variables when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", activeTheme.color);
    
    // Create a faint version of the hex color (approx 6% opacity)
    // We do this by appending '10' (which is hex for ~6% opacity) to the color
    const faintColor = `${activeTheme.color}10`;
    root.style.setProperty("--accent-faint", faintColor);
  }, [activeTheme]);

  return (
    <section id="features" className="grid-section">
      <div className="frame-grid">
        {/* ═══ Left Gutter ═══ */}
        <div className="frame-gutter pattern-topo border-r border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
          <div className="flex flex-col items-center gap-4 mt-12">
            <span className="gutter-coord">02</span>
            <div className="gutter-mark h-20" />
          </div>
          <div className="mt-auto crosshair" />
        </div>

        {/* ═══ Center Content ═══ */}
        <div className="flex flex-col h-full">
          {/* Section Label */}
          <div className="border-b border-[var(--border)] px-6 py-4 shrink-0">
            <span className="section-label">// features</span>
          </div>

          {/* Heading */}
          <div className="px-6 py-10 md:py-16 shrink-0 border-b border-[var(--border)]">
            <h2 className="font-display max-w-[800px] text-[3.5rem] sm:text-5xl md:text-[5.5rem] leading-[1.05] text-[color:var(--text-primary)]">
              Built to scale alongside your infrastructure.
            </h2>
          </div>

          <div className="grid-lines grid-cols-1 md:grid-cols-[2rem_1fr_1fr_1fr_1fr_2rem] lg:grid-cols-[4rem_1fr_1fr_1fr_1fr_4rem] border-y border-[var(--border)] mt-auto bg-[var(--page-bg)]">
            
            {/* ── ROW 1: Top Spacers ── */}
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>

            {/* ── ROW 2: CONTENT ── */}
            <div className="hidden md:block"></div> {/* Left Spacer */}
            
            {/* Syntax */}
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 md:col-span-2 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// syntax</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent)]">
                Syntax you already know
              </h3>
              <p className="font-body mt-4 max-w-md text-base md:text-lg leading-7 text-[color:var(--text-secondary)]">
                If you've written a YAML file, a Dockerfile, or a package.json —
                you can write{" "}
                <span className="font-mono text-[color:var(--accent)] bg-[var(--accent-faint)] px-1.5 py-0.5">
                  .vrd
                </span>{" "}
                without reading the docs first.
              </p>
              <div className="mt-10 max-w-md mt-auto relative z-10">
                <CodeBlock lines={CODE_LINES.slice(0, 6)} />
              </div>
            </div>

            {/* .vrd files */}
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// format</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent)]">
                .vrd files
              </h3>
              <p className="font-body mt-4 text-base md:text-lg leading-7 text-[color:var(--text-secondary)]">
                Plain text. Version controlled. Diffable in every pull request.
                Your diagrams live right next to your code.
              </p>
              <div className="mt-10 p-6 text-center border border-[var(--border-strong)] bg-[var(--page-bg)] transition-colors group-hover:border-[var(--accent)] mt-auto relative z-10">
                <span className="font-mono text-sm text-[color:var(--accent)]">
                  system.vrd
                </span>
              </div>
            </div>

            {/* Git native */}
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// git</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent)]">
                Git native
              </h3>
              <p className="font-body mt-4 text-base md:text-lg leading-7 text-[color:var(--text-secondary)]">
                Every change is a line diff. Review architecture changes the same
                way you review code.
              </p>
              <div className="mt-10 font-mono text-xs border border-[var(--border)] bg-[var(--surface)] mt-auto relative z-10">
                <div className="px-4 py-3 border-b border-[var(--border)] text-[color:var(--accent)] bg-[var(--accent-faint)] transition-colors">
                  + cache redis
                </div>
                <div className="px-4 py-3 border-b border-[var(--border)] text-[color:var(--accent)] bg-[var(--accent-faint)] transition-colors">
                  + web → redis
                </div>
                <div className="px-4 py-3 text-[color:var(--text-muted)]">
                  &nbsp;&nbsp;theme: moss
                </div>
              </div>
            </div>

            <div className="hidden md:block pattern-hatch opacity-30"></div> {/* Right Spacer */}

            {/* ── ROW 3: Middle Spacers ── */}
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>

            {/* ── ROW 4: CONTENT ── */}
            <div className="hidden md:block"></div> {/* Left Spacer */}

            {/* Nodes */}
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// nodes</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent)]">
                10 ready components
              </h3>
              <p className="font-body mt-4 text-base md:text-lg leading-7 text-[color:var(--text-secondary)]">
                Server, database, cache, gateway, queue, cloud, user, service,
                storage, monitor. The ones you actually use.
              </p>
            </div>

            {/* Themes */}
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 md:col-span-2 flex flex-col h-full relative">
              <CadCrosshairs />
              <p className="section-label mb-6">// themes</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)]">
                Themes that set the mood
              </h3>
              <p className="font-body mt-4 max-w-md text-base md:text-lg leading-7 text-[color:var(--text-secondary)]">
                Click a theme below. Watch the entire page's ink shift instantly. No refresh required.
              </p>

              {/* Theme Grid */}
              <div className="grid-lines mt-10 grid-cols-4 sm:grid-cols-8 border border-[var(--border)] mt-auto relative z-10">
                {THEMES_LIST.map((t) => {
                  const isActive = activeTheme.name === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setActiveTheme(t)}
                      className="flex flex-col items-center justify-center gap-2 p-3 font-ui text-xs transition-colors hover:bg-[var(--accent-faint)]"
                      style={{
                        backgroundColor: isActive ? "var(--accent-faint)" : "var(--page-bg)",
                        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="font-medium capitalize">{t.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Theme Preview */}
              <div className="mt-6 flex items-center gap-4 px-5 py-4 border border-[var(--border)] bg-[var(--page-bg)] transition-colors relative z-10">
                <div
                  className="h-8 w-8 transition-colors duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${activeTheme.color}44, ${activeTheme.color})`,
                  }}
                />
                <div>
                  <p className="font-ui text-sm font-medium text-[color:var(--text-primary)] capitalize">
                    {activeTheme.name}
                  </p>
                  <p className="font-mono text-xs text-[color:var(--text-muted)] mt-0.5">
                    theme: {activeTheme.name}
                  </p>
                </div>
                <div className="grid-lines ml-auto grid-cols-4 border border-[var(--border)]">
                  {[0.3, 0.5, 0.7, 1].map((o) => (
                    <div
                      key={o}
                      className="h-6 w-6 transition-colors duration-300"
                      style={{
                        backgroundColor: activeTheme.color,
                        opacity: o,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Empty Hatched Cell */}
            <div className="hidden md:block pattern-hatch opacity-30"></div>
            
            <div className="hidden md:block"></div> {/* Right Spacer */}

            {/* ── ROW 5: Middle Spacers ── */}
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>

            {/* ── ROW 6: CONTENT ── */}
            <div className="hidden md:block pattern-hatch opacity-30"></div> {/* Left Spacer */}

            {/* Quick Start */}
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 md:col-span-2 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// quick start</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent)]">
                Zero to 3D in seconds
              </h3>
              <p className="font-body mt-4 max-w-md text-base md:text-lg leading-7 text-[color:var(--text-secondary)]">
                No Three.js. No WebGL setup. No complex build pipelines. Describe what
                exists. The rest happens automatically.
              </p>
              <div className="mt-10 p-5 font-mono text-sm border border-[var(--border)] bg-[var(--surface)] flex flex-col gap-3 mt-auto relative z-10">
                <div className="flex items-center gap-3">
                  <span className="text-[color:var(--text-muted)]">$</span>
                  <span className="text-[color:var(--text-primary)]">npx verdant init</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[color:var(--accent)] transition-colors">✓</span>
                  <span className="text-[color:var(--text-secondary)]">Ready. Open playground or edit system.vrd</span>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// export</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)] transition-colors group-hover:text-[color:var(--accent)]">
                Export anything
              </h3>
              <p className="font-body mt-4 text-base md:text-lg leading-7 text-[color:var(--text-secondary)]">
                Screenshot, 3D model, video walkthrough, or a flat SVG. Whatever
                your team needs.
              </p>
              <div className="grid-lines mt-10 grid-cols-2 border border-[var(--border)] mt-auto relative z-10">
                {["PNG", "GLB", "MP4", "SVG"].map((f) => (
                  <div
                    key={f}
                    className="px-3 py-4 text-center font-mono text-xs text-[color:var(--text-muted)] transition-colors hover:bg-[var(--accent-faint)] hover:text-[color:var(--accent)] cursor-default"
                  >
                    .{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Empty Hatched Cell */}
            <div className="hidden md:block pattern-hatch opacity-30"></div>
            
            <div className="hidden md:block"></div> {/* Right Spacer */}

            {/* ── ROW 7: Bottom Spacers ── */}
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>

          </div>
        </div>

        {/* ═══ Right Gutter ═══ */}
        <div className="frame-gutter pattern-dots border-l border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
          <div className="flex flex-col items-center gap-4 mt-auto mb-12">
            <div className="gutter-mark h-20" />
            <span className="gutter-coord">10</span>
          </div>
          <div className="crosshair" />
        </div>
      </div>
    </section>
  );
}