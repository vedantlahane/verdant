"use client";

import { LeafRain } from "@/features/shared/ui/LeafRain";

const STEPS = [
  {
    num: "01",
    title: "Write",
    desc: "Describe your system in plain text. Components, connections, that's it. If you've written a config file, you already know this.",
  },
  {
    num: "02",
    title: "Grow",
    desc: "Your diagram renders in 3D. Nodes find their place. Edges draw themselves. The system takes shape the moment you describe it.",
  },
  {
    num: "03",
    title: "Explore",
    desc: "Orbit around your architecture. Zoom into a service. Export a screenshot. Share a link. It's yours.",
  },
];

export function HowItWorks() {
  return (
    <section
      className="border-b"
      style={{ borderColor: "var(--border-strong)" }}
    >
      <div className="frame-grid">
        {/* ═══ Left Gutter ═══ */}
        <div
          className="frame-gutter pattern-topo border-r py-6 opacity-60"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="crosshair" />
        </div>

        {/* ═══ Center ═══ */}
        <div>
          {/* Section label */}
          <div
            className="px-5 py-3 md:px-8 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="section-label">// how it works</span>
          </div>

          {/* Steps */}
          <div className="grid-lines md:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.num} className="group relative px-5 py-10 md:px-8 md:py-12 transition-colors hover:bg-[var(--accent-faint)]/30 overflow-hidden">
                {/* Large faded background number for depth */}
                <div className="absolute -right-4 top-4 font-mono text-8xl font-bold opacity-5 select-none transition-transform duration-500 group-hover:scale-110 group-hover:-translate-x-4">
                  {item.num}
                </div>
                
                <div className="relative z-10">
                  <span className="inline-flex h-8 items-center rounded-full border border-[var(--border-strong)] bg-[var(--page-bg)] px-3 font-mono text-xs text-[var(--text-muted)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                    step {item.num}
                  </span>
                  
                  <h2 className="font-display text-3xl sm:text-4xl mt-6 font-semibold tracking-tight text-[color:var(--text-primary)]">
                    {item.title}
                  </h2>
                  <p
                    className="font-body mt-4 max-w-xs text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.desc}
                  </p>

                  {/* Per-step micro CTA */}
                  <div className="mt-8">
                    <LeafRain className="btn-secondary inline-flex transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                      <span className="btn-content text-xs font-semibold tracking-wide">
                        {item.num === "01"
                          ? "See syntax →"
                          : item.num === "02"
                            ? "Watch demo →"
                            : "Try it now →"}
                      </span>
                    </LeafRain>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Right Gutter ═══ */}
        <div
          className="frame-gutter pattern-dots border-l py-6 opacity-60"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="crosshair" />
        </div>
      </div>
    </section>
  );
}