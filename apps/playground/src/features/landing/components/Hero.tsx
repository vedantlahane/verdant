"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { LeafRain } from "@/features/shared/ui/LeafRain";

export function Hero() {
  return (
    <section className="grid-section">
      <div className="frame-grid">
        {/* ═══ Left Gutter ═══ */}
        <div className="frame-gutter pattern-dots border-r border-[var(--border)] py-6">
          {/* Replace one crosshair in left gutter */}
<div className="crosshair crosshair-pulse" />
          <div className="flex flex-col items-center gap-4">
            <span className="gutter-coord">00</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 48 48"
              fill="none"
              className="leaf-sway opacity-20"
              aria-hidden="true"
            >
              <path
                d="M34 7c-9 1-16 5-20 12-3 5-3 11-1 16 5 0 11-1 16-5C36 24 40 17 41 8c-2-1-4-1-7-1Z"
                fill="var(--accent)"
              />
            </svg>
            <span className="gutter-coord">01</span>
          </div>
          <div className="crosshair" />
        </div>

        {/* ═══ Center Content ═══ */}
        <div className="pattern-topo flex flex-col h-full">
          {/* Label */}
          <div className="border-b border-[var(--border)] px-6 py-4 shrink-0">
            <span className="section-label">// where architecture grows</span>
          </div>

          {/* Headline & Body */}
          <div className="px-6 py-10 md:py-12 shrink-0 border-b border-[var(--border)] hero-stagger">
            {/* Drop this right before your <h1> */}
<span className="inline-block font-mono text-[0.65rem] tracking-[0.2em] text-[color:var(--text-muted)] border border-[var(--border)] px-3 py-1 mb-6">
  v0.1 · public beta
</span>
            {/* Replace your current h1 classes */}
<h1 className="font-display max-w-[1200px] text-[clamp(3rem,8vw,7.5rem)] leading-[1.02]">
              Design systems{" "}
              <span style={{ color: "var(--accent)" }}>in 3D.</span>
            </h1>

            <p className="font-body mt-6 max-w-[600px] text-base md:text-lg leading-7 md:leading-8 text-[color:var(--text-secondary)]">
              Verdant lets you describe architecture using a readable syntax and
              automatically generate interactive diagrams that help you{" "}
              <span style={{ color: "var(--accent)" }}>explore</span> systems,
              relationships, and infrastructure visually.
            </p>
            {/* After your <p> body text */}
<span className="inline-block mt-4 font-mono text-[0.65rem] tracking-[0.15em] text-[color:var(--text-muted)]">
  open source · no account required · runs in-browser
</span>
          </div>

          {/* ═══ Single Responsive CTA Grid ═══ */}
          <div className="grid grid-lines grid-cols-1 sm:grid-cols-2 md:grid-cols-[4rem_1fr_1fr_4rem_1.5fr_4rem] border-y border-[var(--border)] mt-auto">
            
            {/* Desktop-only top spacer row */}
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />

            {/* Desktop left spacer */}
            <div className="hidden md:block" />

            {/* ── Primary CTA ── */}
            <LeafRain
              className={[
                "group w-full h-full transition-colors hover:bg-[var(--accent)]",
                // Mobile: full width. SM: span 2. MD: span 2 cols + 3 rows
                "col-span-1 sm:col-span-2 md:col-span-2 md:row-span-3",
              ].join(" ")}
            >
              <div className="flex flex-col justify-between p-6 lg:p-8 min-h-[200px] md:min-h-0 h-full w-full">
                <Link
                  href="/playground"
                  className="absolute inset-0 z-20"
                  aria-label="Open Playground"
                />
                <span className="leading-none text-4xl lg:text-5xl tracking-tight text-[color:var(--text-primary)] transition-colors group-hover:text-[#000000] relative z-10 font-ui font-medium">
                  Open
                  <br />
                  Playground
                </span>
                <ArrowRight className="h-8 w-8 self-end transition-all group-hover:translate-x-2 text-[color:var(--text-primary)] group-hover:text-[#000000] relative z-10" />
              </div>
            </LeafRain>

            {/* Desktop mid spacer */}
            <div className="hidden md:block" />

            {/* ── Documentation CTA ── */}
            <LeafRain
              className={[
                "group w-full h-full transition-colors",
                "text-[color:var(--text-secondary)]",
                "hover:bg-[var(--surface)] hover:text-[color:var(--text-primary)]",
                // Mobile: single col. MD: col 5 only
                "col-span-1",
              ].join(" ")}
            >
              <div className="flex flex-col justify-between p-6 font-ui text-sm font-medium min-h-[120px] md:min-h-[140px] h-full w-full">
                <a
                  href="#features"
                  className="absolute inset-0 z-20"
                  aria-label="Documentation"
                />
                <span className="leading-snug text-base relative z-10">
                  Documentation
                </span>
                <ArrowRight className="h-5 w-5 self-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 relative z-10" />
              </div>
            </LeafRain>

            {/* Desktop right spacer */}
            <div className="hidden md:block" />

            {/* Desktop middle spacer row */}
            <div className="hidden md:block h-16" />
            {/* cols 2-3 covered by primary */}
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />

            {/* Desktop left spacer */}
            <div className="hidden md:block" />
            {/* cols 2-3 covered by primary */}
            <div className="hidden md:block" />

            {/* ── GitHub CTA ── */}
            <LeafRain
              className={[
                "group w-full h-full transition-colors",
                "text-[color:var(--text-secondary)]",
                "hover:bg-[var(--surface)] hover:text-[color:var(--text-primary)]",
                "col-span-1",
              ].join(" ")}
            >
              <div className="flex flex-col justify-between p-6 font-ui text-sm font-medium min-h-[120px] md:min-h-[140px] h-full w-full">
                <a
                  href="https://github.com/vedantlahane/verdant"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-20"
                  aria-label="GitHub Repo"
                />
                <span className="leading-snug text-base relative z-10">
                  GitHub Repo
                </span>
                <ArrowUpRight className="h-5 w-5 self-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 relative z-10" />
              </div>
            </LeafRain>

            {/* Desktop right spacer */}
            <div className="hidden md:block" />

            {/* Desktop bottom spacer row */}
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
            <div className="hidden md:block h-16" />
          </div>
        </div>

        {/* ═══ Right Gutter ═══ */}
        <div className="frame-gutter pattern-dots border-l border-[var(--border)] py-6">
          <div className="crosshair" />
          <div className="flex flex-col items-center gap-4">
            <span className="gutter-coord">10</span>
            <div className="flex flex-col items-center gap-1.5">
              <div className="gutter-mark h-8" />
              <div className="gutter-dot" />
              <div className="gutter-mark h-8" />
            </div>
            <span className="gutter-coord">11</span>
          </div>
          <div className="crosshair" />
        </div>
      </div>
    </section>
  );
}