"use client";

import { CodeBlock } from "./CodeBlock";
import { CODE_LINES, THEMES_LIST } from "../constants";
import { useAccentTheme } from "@/features/shared/hooks/useAccentTheme";
import { ThemeInkSelector } from "../../shared/ui/ThemeInkSelector";

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
  const { activeTheme, setActiveTheme, mounted } = useAccentTheme();

  return (
    <section id="features" className="grid-section">
      <div className="frame-grid">
        <div className="frame-gutter pattern-topo border-r border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
          <div className="flex flex-col items-center gap-4 mt-12">
            <span className="gutter-coord">02</span>
            <div className="gutter-mark h-20" />
          </div>
          <div className="mt-auto crosshair" />
        </div>

        <div className="flex flex-col h-full">
          <div className="border-b border-[var(--border)] px-6 py-4 shrink-0">
            <span className="section-label">// features</span>
          </div>

          <div className="px-6 py-10 md:py-16 shrink-0 border-b border-[var(--border)]">
            <h2 className="font-display max-w-[800px] text-[3.5rem] sm:text-5xl md:text-[5.5rem] leading-[1.05] text-[color:var(--text-primary)]">
              Built to scale alongside your infrastructure.
            </h2>
          </div>

          <div className="grid-lines grid-cols-1 md:grid-cols-[2rem_1fr_1fr_1fr_1fr_2rem] lg:grid-cols-[4rem_1fr_1fr_1fr_1fr_4rem] border-y border-[var(--border)] mt-auto bg-[var(--page-bg)]">
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>

            <div className="hidden md:block"></div>
            
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 md:col-span-2 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// syntax</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)]">Syntax you already know</h3>
              <p className="font-body mt-4 max-w-md text-base md:text-lg text-[color:var(--text-secondary)]">
                Write <span className="font-mono text-[color:var(--accent)] bg-[var(--accent-faint)] px-1.5 py-0.5">.vrd</span> files without reading the docs first.
              </p>
              <div className="mt-10 max-w-md mt-auto relative z-10">
                <CodeBlock lines={CODE_LINES.slice(0, 6)} />
              </div>
            </div>

            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// format</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)]">.vrd files</h3>
              <div className="mt-10 p-6 text-center border border-[var(--border-strong)] bg-[var(--page-bg)] mt-auto relative z-10">
                <span className="font-mono text-sm text-[color:var(--accent)]">system.vrd</span>
              </div>
            </div>

            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// git</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)]">Git native</h3>
              <div className="mt-10 font-mono text-xs border border-[var(--border)] bg-[var(--surface)] mt-auto relative z-10">
                <div className="px-4 py-3 border-b border-[var(--border)] text-[color:var(--accent)] bg-[var(--accent-faint)]">+ cache redis</div>
                <div className="px-4 py-3 text-[color:var(--text-muted)]">&nbsp;&nbsp;theme: moss</div>
              </div>
            </div>

            <div className="hidden md:block pattern-hatch opacity-30"></div>

            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12 pattern-hatch opacity-30"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>
            <div className="hidden md:block h-8 lg:h-12"></div>

            <div className="hidden md:block"></div>

            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 hover:bg-[var(--accent-faint)] transition-colors group flex flex-col h-full">
              <CadCrosshairs />
              <p className="section-label mb-6">// nodes</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)]">10 ready components</h3>
            </div>

            {/* Themes Section using Shared Component */}
            <div className="cad-hover px-6 py-10 md:p-8 lg:p-10 md:col-span-2 flex flex-col h-full relative">
              <CadCrosshairs />
              <p className="section-label mb-6">// themes</p>
              <h3 className="font-ui font-medium text-xl text-[color:var(--text-primary)]">Themes that set the mood</h3>
              <div className="mt-auto pt-10">
                <ThemeInkSelector 
                  activeTheme={activeTheme} 
                  onSelect={setActiveTheme} 
                  mounted={mounted} 
                  columns={4}
                />
              </div>
            </div>

            <div className="hidden md:block pattern-hatch opacity-30"></div>
            <div className="hidden md:block"></div>
          </div>
        </div>
        <div className="frame-gutter pattern-dots border-l border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
        </div>
      </div>
    </section>
  );
}