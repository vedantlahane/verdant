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
          <div className="crosshair" />
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

          {/* Headline & Body Combined - Added border-b */}
          <div className="px-6 py-10 md:py-12 shrink-0 border-b border-[var(--border)]">
            <h1 className="font-display max-w-[1200px] text-[4.5rem] sm:text-6xl md:text-[7.5rem] leading-[1.02]">
              Design systems <span style={{ color: "var(--accent)" }}>in 3D.</span>
            </h1>
            
            <p className="font-body mt-6 max-w-[600px] text-base md:text-lg leading-7 md:leading-8 text-[color:var(--text-secondary)]">
              Verdant lets you describe architecture using a readable syntax and
              automatically generate interactive diagrams that help you{" "}
              <span style={{ color: "var(--accent)" }}>explore</span> systems,
              relationships, and infrastructure visually.
            </p>
          </div>

          {/* CTAs Enclosed in a 6x5 Blueprint Grid 
             Spacer columns (1, 4, 6) are 4rem wide. 
             Spacer rows (1, 3, 5) are 4rem high. 
          */}
          
          {/* DESKTOP STRICT GRID */}
          <div className="hidden md:grid grid-lines grid-cols-[4rem_1fr_1fr_4rem_1.5fr_4rem] border-y border-[var(--border)] mt-auto">
            
            {/* ── ROW 1: Top Spacers ── */}
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>

            {/* ── ROW 2: Top Half of Content ── */}
            <div className=""></div> {/* Col 1: Left Spacer */}

            {/* Primary CTA (Col 2 & 3, Spans Rows 2, 3, 4) */}
            <LeafRain 
              className="group col-span-2 row-span-3 !block w-full h-full transition-colors hover:bg-[var(--accent)]"
            >
              <div className="flex flex-col justify-between p-6 lg:p-8 h-full w-full">
                <Link href="/playground" className="absolute inset-0 z-20" aria-label="Open Playground" />
                <span className="leading-none text-4xl lg:text-5xl tracking-tight text-[color:var(--text-primary)] transition-colors group-hover:text-[#000000] relative z-10 font-ui font-medium">
                  Open<br/>Playground
                </span>
                <ArrowRight className="h-8 w-8 self-end transition-all group-hover:translate-x-2 text-[color:var(--text-primary)] group-hover:text-[#000000] relative z-10" />
              </div>
            </LeafRain>

            <div className=""></div> {/* Col 4: Middle Spacer */}

            {/* Secondary CTA 1 (Col 5) */}
            <LeafRain 
              className="group !block w-full h-full transition-colors text-[color:var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[color:var(--text-primary)]"
            >
              <div className="flex flex-col justify-between p-6 font-ui text-sm font-medium min-h-[140px] h-full w-full">
                <a href="#features" className="absolute inset-0 z-20" aria-label="Documentation"></a>
                <span className="leading-snug text-base relative z-10">Documentation</span>
                <ArrowRight className="h-5 w-5 self-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 relative z-10" />
              </div>
            </LeafRain>

            <div className=""></div> {/* Col 6: Right Spacer */}


            {/* ── ROW 3: Middle Spacers ── */}
            <div className="h-16"></div> {/* Col 1 */}
            {/* Col 2 & 3 covered by Primary CTA */}
            <div className="h-16"></div> {/* Col 4 */}
            <div className="h-16"></div> {/* Col 5: Spacer between secondary buttons */}
            <div className="h-16"></div> {/* Col 6 */}


            {/* ── ROW 4: Bottom Half of Content ── */}
            <div className=""></div> {/* Col 1: Left Spacer */}
            {/* Col 2 & 3 covered by Primary CTA */}
            <div className=""></div> {/* Col 4: Middle Spacer */}

            {/* Secondary CTA 2 (Col 5) */}
            <LeafRain 
              className="group !block w-full h-full transition-colors text-[color:var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[color:var(--text-primary)]"
            >
              <div className="flex flex-col justify-between p-6 font-ui text-sm font-medium min-h-[140px] h-full w-full">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-20" aria-label="GitHub Repo"></a>
                <span className="leading-snug text-base relative z-10">GitHub Repo</span>
                <ArrowUpRight className="h-5 w-5 self-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 relative z-10" />
              </div>
            </LeafRain>

            <div className=""></div> {/* Col 6: Right Spacer */}


            {/* ── ROW 5: Bottom Spacers ── */}
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>
            <div className="h-16"></div>
          </div>

          {/* MOBILE COMPACT GRID */}
          {/* <div className="grid-lines grid-cols-1 sm:grid-cols-2 md:hidden border-y border-[var(--border)] mt-auto">
            <LeafRain className="group sm:col-span-2 !block w-full h-full transition-colors hover:bg-[var(--accent)]">
              <div className="flex flex-col justify-between p-6 min-h-[220px] h-full w-full">
                <Link href="/playground" className="absolute inset-0 z-20" aria-label="Open Playground" />
                <span className="leading-none text-4xl tracking-tight text-[color:var(--text-primary)] transition-colors group-hover:text-[#000000] relative z-10 font-ui font-medium">
                  Open<br/>Playground
                </span>
                <ArrowRight className="h-8 w-8 self-end transition-all group-hover:translate-x-2 text-[color:var(--text-primary)] group-hover:text-[#000000] relative z-10" />
              </div>
            </LeafRain>
            
            <LeafRain className="group !block w-full h-full transition-colors text-[color:var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[color:var(--text-primary)]">
              <div className="flex flex-col justify-between p-6 font-ui text-sm font-medium min-h-[120px] h-full w-full">
                <a href="#features" className="absolute inset-0 z-20" aria-label="Documentation"></a>
                <span className="leading-snug text-base relative z-10">Documentation</span>
                <ArrowRight className="h-5 w-5 self-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 relative z-10" />
              </div>
            </LeafRain>

            <LeafRain className="group !block w-full h-full transition-colors text-[color:var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[color:var(--text-primary)]">
              <div className="flex flex-col justify-between p-6 font-ui text-sm font-medium min-h-[120px] h-full w-full">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-20" aria-label="GitHub Repo"></a>
                <span className="leading-snug text-base relative z-10">GitHub Repo</span>
                <ArrowUpRight className="h-5 w-5 self-end opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 relative z-10" />
              </div>
            </LeafRain>
          </div> */}
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