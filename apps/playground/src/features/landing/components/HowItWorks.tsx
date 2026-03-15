"use client";

const STEPS = [
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
];

export function HowItWorks() {
  return (
    <section className="grid-section">
      <div className="mx-auto max-w-[1200px]">
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="section-label">// how it works</span>
        </div>

        <div className="grid-lines md:grid-cols-3">
          {STEPS.map((item) => (
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
  );
}
