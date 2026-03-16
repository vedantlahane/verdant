"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import LeafRain from "../../shared/ui/LeafRain";
import CadCrosshairs from "../../shared/ui/CadCrosshairs";
import { COMPONENTS } from "../constants";

export function ComponentsSection() {
  return (
    <section id="components" className="grid-section">
      <div className="frame-grid">
        {/* ═══ Left Gutter ═══ */}
        <div className="frame-gutter pattern-dots border-r border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
          <div className="flex flex-col items-center gap-4 mt-12">
            <span className="gutter-coord">03</span>
            <div className="gutter-mark h-20" />
          </div>
          <div className="mt-auto crosshair" />
        </div>

        {/* ═══ Center Content ═══ */}
        <div className="flex flex-col h-full">
          {/* Section Label */}
          <div className="border-b border-[var(--border)] px-6 py-4 shrink-0">
            <span className="section-label">// components</span>
          </div>

          {/* Heading */}
          <div className="px-6 py-10 md:py-16 shrink-0 border-b border-[var(--border)]">
            <h2 className="font-display max-w-[800px] text-[3.5rem] sm:text-5xl md:text-[5.5rem] leading-[1.05] text-[color:var(--text-primary)]">
              Pieces that fit.
            </h2>
            <p className="font-body mt-6 max-w-md text-base md:text-lg leading-7 md:leading-8 text-[color:var(--text-secondary)]">
              Pre-built 3D nodes for the infrastructure you actually work with.
              Type the name, it instantly appears in your diagram.
            </p>
          </div>

          <div className="hidden md:grid grid-lines grid-cols-[2rem_repeat(5,1fr)_2rem] lg:grid-cols-[4rem_repeat(5,1fr)_4rem] border-y border-[var(--border)] mt-auto bg-[var(--page-bg)]">
            
            {/* ── ROW 1: Top Spacers ── */}
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="h-8 lg:h-12"></div>

            {/* ── ROW 2: Components 1-5 ── */}
            <div className=""></div> {/* Left Spacer */}
            {COMPONENTS.slice(0, 5).map((c) => (
              <div 
                key={c} 
                className="cad-hover group flex flex-col items-center justify-center gap-4 px-5 py-12 transition-colors hover:bg-[var(--accent-faint)] cursor-default"
              >
                <CadCrosshairs />
                <span
                  className="font-mono text-lg transition-colors text-[color:var(--text-muted)] group-hover:text-[color:var(--accent)] relative z-10"
                >
                  ◇
                </span>
                <span className="font-mono text-sm font-medium tracking-tight transition-colors text-[color:var(--text-muted)] group-hover:text-[color:var(--accent)] relative z-10">
                  {c}
                </span>
              </div>
            ))}
            <div className="pattern-hatch opacity-30"></div> {/* Right Spacer */}

            {/* ── ROW 3: Components 6-10 ── */}
            <div className="pattern-hatch opacity-30"></div> {/* Left Spacer */}
            {COMPONENTS.slice(5, 10).map((c) => (
              <div 
                key={c} 
                className="cad-hover group flex flex-col items-center justify-center gap-4 px-5 py-12 transition-colors hover:bg-[var(--accent-faint)] cursor-default"
              >
                <CadCrosshairs />
                <span
                  className="font-mono text-lg transition-colors text-[color:var(--text-muted)] group-hover:text-[color:var(--accent)] relative z-10"
                >
                  ◇
                </span>
                <span className="font-mono text-sm font-medium tracking-tight transition-colors text-[color:var(--text-muted)] group-hover:text-[color:var(--accent)] relative z-10">
                  {c}
                </span>
              </div>
            ))}
            <div className=""></div> {/* Right Spacer */}

            {/* ── ROW 4: Middle Spacers ── */}
            <div className="h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12 pattern-hatch opacity-30"></div>

            {/* ── ROW 5: Bottom CTA ── */}
            <div className=""></div> {/* Left Spacer */}
            <LeafRain className="cad-hover col-span-5 px-8 py-6 group transition-colors hover:bg-[var(--accent-faint)]" spawnInterval={20} maxLeaves={1200}>
              <div className="w-full flex items-center">
                <CadCrosshairs />
                <Link
                  href="/playground"
                  className="inline-flex items-center gap-2 font-ui text-sm font-medium transition-colors text-[color:var(--text-primary)] group-hover:text-[color:var(--accent)] relative z-10"
                >
                  Try them in the playground <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <span className="font-mono text-xs text-[color:var(--text-muted)] relative z-10 ml-auto">
                  + Custom node support coming soon
                </span>
              </div>
            </LeafRain>
            <div className="pattern-hatch opacity-30"></div> {/* Right Spacer */}

            {/* ── ROW 6: Bottom Spacers ── */}
            <div className="h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12"></div>
            <div className="h-8 lg:h-12 pattern-hatch opacity-30"></div>
          </div>

          {/* MOBILE COMPACT GRID */}
          {/* <div className="grid-lines grid-cols-2 md:hidden border-y border-[var(--border)] mt-auto bg-[var(--page-bg)]">
            {COMPONENTS.map((c) => (
              <div 
                key={c} 
                className="group flex flex-col items-center justify-center gap-4 px-5 py-10 transition-colors hover:bg-[var(--accent-faint)] cursor-default"
              >
                <span
                  className="font-mono text-lg transition-colors text-[color:var(--text-muted)] group-hover:text-[color:var(--accent)]"
                >
                  ◇
                </span>
                <span className="font-mono text-sm font-medium tracking-tight transition-colors text-[color:var(--text-muted)] group-hover:text-[color:var(--accent)]">
                  {c}
                </span>
              </div>
            ))} */}
            
            {/* Bottom Bar Mobile */}
            {/* <div className="col-span-2 px-6 py-6 flex flex-col items-start gap-4">
              <Link
                href="/playground"
                className="group inline-flex items-center gap-2 font-ui text-sm font-medium transition-colors text-[color:var(--text-primary)] hover:text-[color:var(--accent)]"
              >
                Try them in the playground <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div> */}
        </div>

        {/* ═══ Right Gutter ═══ */}
        <div className="frame-gutter pattern-hatch border-l border-[var(--border)] py-6 opacity-40">
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