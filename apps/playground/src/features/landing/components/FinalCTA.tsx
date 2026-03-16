"use client";

import LeafRain from "../../shared/ui/LeafRain";

export function FinalCTA() {
  return (
    <section className="grid-section">
      <div className="frame-grid">
        {/* ═══ Left Gutter ═══ */}
        <div className="frame-gutter pattern-dots border-r border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
          <div className="mt-auto crosshair" />
        </div>

        {/* ═══ Center Content ═══ */}
        <LeafRain className="pattern-topo flex flex-col h-full justify-center" spawnInterval={20} maxLeaves={11180}>
          {/* Heading */}
          <div className="px-6 py-28 md:py-40 text-center flex flex-col items-center">
            <h2 className="font-display max-w-[900px] text-[3.5rem] sm:text-5xl md:text-[6.5rem] leading-[1.05] text-[color:var(--text-primary)]">
              Your systems are <span style={{ color: "var(--accent)" }}>alive</span>. Let them look like it.
            </h2>
            
            <p className="font-body mt-8 text-base md:text-lg max-w-lg leading-7 text-[color:var(--text-secondary)]">
              Stop drawing boxes. Start growing architecture.
            </p>
          </div>
        </LeafRain>

        {/* ═══ Right Gutter ═══ */}
        <div className="frame-gutter pattern-hatch border-l border-[var(--border)] py-6 opacity-40">
          <div className="crosshair" />
          <div className="mt-auto crosshair" />
        </div>
      </div>
    </section>
  );
}