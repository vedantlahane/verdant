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
            <span className="inline-block font-mono text-[0.65rem] tracking-[0.2em] text-[color:var(--text-muted)] border border-[var(--border)] px-3 py-1 mb-6">
              v0.1 · public beta
            </span>
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
            <span className="inline-block mt-4 font-mono text-[0.65rem] tracking-[0.15em] text-[color:var(--text-muted)]">
              open source · no account required · runs in-browser
            </span>
          </div>

          {/* ═══ 7-Column Simplified Responsive CTA Grid ═══ */}
          <div className="grid grid-lines grid-cols-1 sm:grid-cols-2 md:grid-cols-[8rem_1fr_1fr_8rem_1fr_1fr_8rem] border-y border-[var(--border)] mt-auto">
            
            {/* ROW 1 (h-16) */}
            <div className="hidden md:flex h-16 items-center justify-center"> {/* C1: sp */}
              <div className="crosshair" />
            </div>
            <div className="hidden md:block h-16" /> {/* C2: sp */}
            <div className="hidden md:block h-16" /> {/* C3: sp */}
            <div className="hidden md:block h-16" /> {/* C4: sp */}
            <div className="hidden md:block h-16" /> {/* C5: sp */}
            
            {/* ── Documentation CTA (Spans Row 1 & Row 2) ── */}
            <LeafRain
              className="group w-full h-full transition-colors text-[color:var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[color:var(--text-primary)] col-span-1 md:col-span-2 md:row-span-2 "
            >
              <div className="flex flex-col justify-between p-6 font-ui text-sm font-medium min-h-[120px] md:min-h-0 h-full w-full">
                <a href="#features" className="absolute inset-0 z-20" aria-label="Documentation" />
                <span className="leading-snug text-base relative z-10">Documentation</span>
                <ArrowRight className="h-5 w-5 self-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 relative z-10" />
              </div>
            </LeafRain>

            {/* ROW 2 (h-32 - Merged) */}
            <div className="hidden md:flex h-44 items-end justify-center pb-2"> {/* C1: sp */}
              <span className="gutter-coord">x0</span>
            </div>
            
            {/* ── Primary CTA (Spans Row 2 & Row 3) ── */}
            <LeafRain
              className="group w-full h-full transition-colors hover:bg-[var(--accent)] col-span-1 sm:col-span-2 md:col-span-2 md:row-span-2 !block"
            >
              <div className="flex flex-col justify-between p-6 lg:p-8 min-h-[200px] md:min-h-0 h-full w-full">
                <Link href="/playground" className="absolute inset-0 z-20" aria-label="Open Playground" />
                <span className="leading-none text-4xl lg:text-5xl tracking-tight text-[color:var(--text-primary)] transition-colors group-hover:text-[#000000] relative z-10 font-ui font-medium">
                  Open<br />Playground
                </span>
                <ArrowRight className="h-8 w-8 self-end transition-all group-hover:translate-x-2 text-[color:var(--text-primary)] group-hover:text-[#000000] relative z-10" />
              </div>
            </LeafRain>

            <div className="hidden md:flex h-44 items-center justify-center"> {/* C4: sp (guide) */}
              <div className="w-px h-full border-l border-dashed border-[var(--accent)] opacity-10" />
            </div>
            <div className="hidden md:block h-44 pattern-hatch opacity-15" /> {/* C5: sp */}
            {/* C6-7 covered by DOC (spans into R2) */}

            {/* ROW 3 (h-44 - Merged) */}
            <div className="hidden md:flex h-44 items-start justify-center pt-2"> {/* C1: sp */}
              <span className="gutter-coord">y1</span>
            </div>
            {/* C2-3 covered by PLAY (spans into R3) */}
            <div className="hidden md:block h-44" /> {/* C4: sp */}
            
            {/* ── GitHub CTA (Spans Row 3 & Row 4) ── */}
            <LeafRain
              className="group w-full h-full transition-colors text-[color:var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[color:var(--text-primary)] col-span-1 md:col-span-2 md:row-span-2 !block"
            >
              <div className="flex flex-col justify-between p-6 font-ui text-sm font-medium min-h-[120px] md:min-h-0 h-full w-full">
                <a href="https://github.com/vedantlahane/verdant" target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-20" aria-label="GitHub Repo" />
                <span className="leading-snug text-base relative z-10">GitHub Repo</span>
                <ArrowUpRight className="h-5 w-5 self-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 relative z-10" />
              </div>
            </LeafRain>
            
            <div className="hidden md:flex h-44 items-center justify-center"> {/* C7: sp */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 48 48"
                fill="none"
                className="opacity-10"
                aria-hidden="true"
              >
                <path
                  d="M34 7c-9 1-16 5-20 12-3 5-3 11-1 16 5 0 11-1 16-5C36 24 40 17 41 8c-2-1-4-1-7-1Z"
                  fill="var(--accent)"
                />
              </svg>
            </div>

            {/* ROW 4 (h-16) */}
            <div className="hidden md:block h-16" /> {/* C1: sp */}
            <div className="hidden md:block h-16" /> {/* C2: sp */}
            <div className="hidden md:block h-16 pattern-hatch opacity-15" /> {/* C3: sp */}
            <div className="hidden md:block h-16" /> {/* C4: sp */}
            {/* C5-6 covered by GIT (spans into R4) */}
            <div className="hidden md:block h-16" /> {/* C7: sp */}
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