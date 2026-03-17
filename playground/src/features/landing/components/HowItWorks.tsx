"use client";

import { LeafRain } from "@/features/shared/ui/LeafRain";

const STEPS = [
  {
    num: "01",
    title: "Write",
    desc: "Describe your system in plain text. Components, connections, that's it. If you've written a config file, you already know this.",
    cta: "See syntax",
    href: "#",
  },
  {
    num: "02",
    title: "Grow",
    desc: "Your diagram renders in 3D. Nodes find their place. Edges draw themselves. The system takes shape the moment you describe it.",
    cta: "Watch demo",
    href: "#",
  },
  {
    num: "03",
    title: "Explore",
    desc: "Orbit around your architecture. Zoom into a service. Export a screenshot. Share a link. It's yours.",
    cta: "Try it now",
    href: "/playground",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-b"
      style={{ borderColor: "var(--border-strong)" }}
    >
      <div className="frame-grid">
        {/* Left Gutter */}
        <div
          className="frame-gutter pattern-topo border-r py-6 opacity-60"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="crosshair" />
        </div>

        {/* Center */}
        <div>
          <div
            className="px-5 py-3 md:px-8 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="section-label">// how it works</span>
          </div>

          <div className="grid-lines md:grid-cols-3">
            {STEPS.map((item) => (
              <div
                key={item.num}
                className="group relative px-5 py-10 md:px-8 md:py-12 overflow-hidden step-cell"
              >
                {/* Background number */}
                <div
                  className="absolute -right-4 top-4 font-mono text-8xl font-bold select-none transition-transform duration-500 group-hover:scale-110 group-hover:-translate-x-4"
                  style={{ opacity: 0.04 }}
                  aria-hidden="true"
                >
                  {item.num}
                </div>

                <div className="relative z-10">
                  <span className="inline-flex h-8 items-center rounded-full border border-[var(--border-strong)] bg-[var(--page-bg)] px-3 font-mono text-xs text-[color:var(--text-muted)] transition-colors group-hover:border-[var(--accent)] group-hover:text-[color:var(--accent)]">
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

                  {/* ═══ CTA enclosed in horizontal lines ═══
                      ── [ See syntax  → ] ──────────────────
                      Lines flow full width, button sits inside
                  */}
                  <div className="relative mt-10">
                    {/* Top line — full width */}
                    <div
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: "var(--border)" }}
                    />

                    {/* Bottom line — full width */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-px"
                      style={{ background: "var(--border)" }}
                    />

                    {/* Button row — sits between the two lines */}
                    <div className="flex items-center">
                      <LeafRain
                        className="relative z-10 transition-colors hover:bg-[var(--accent-faint)] border-r border-[var(--border)]"
                        spawnInterval={50}
                        maxLeaves={100}
                      >
                        <a
                          href={item.href}
                          className="flex items-center px-5 py-3 font-mono text-xs tracking-wide text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--accent)]"
                        >
                          {item.cta}
                        </a>
                      </LeafRain>

                      {/* Arrow cell — bordered box */}
                      <div className="flex items-center justify-center px-4 py-3 border-r border-[var(--border)] text-[color:var(--text-muted)] transition-all group-hover:text-[color:var(--accent)]">
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </div>

                      {/* Line continues — empty space fills rest */}
                      <div className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Gutter */}
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