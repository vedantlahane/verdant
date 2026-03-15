"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section
      className="pattern-topo border-y mx-8"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="mx-auto border-x pb-32 pt-24 sm:pt-32 md:pb-40 md:pt-40"
        /*                    ^^^^ FIX: was "pb-" (typo, missing value) */
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="section-label border-b px-4 py-3"
          /*                       ^^^^^^^^ FIX: border-b only, not border-y
                                   The section border-y already handles top */
          style={{ borderColor: "var(--border)" }}
        >
          // where architecture grows
        </p>

        <div className="px-4 py-10">
          {/* FIX: removed border-y — was creating too many horizontal lines
              FIX: py-6 → py-10 — more breathing room around headline */}
          <h1 className="font-display max-w-[1400px] text-6xl leading-[1.05] sm:text-7xl md:text-[8rem]">
            Design systems in 3D.
          </h1>
        </div>

        <div
          className="px-4 py-6 border-t"
          /*                    ^^^^^^^^ FIX: border-t only, not border-y
                               Creates one clean divider between heading and body */
          style={{ borderColor: "var(--border)" }}
        >
          <p
            className="font-body max-w-[1400px] text-lg leading-8"
            style={{ color: "var(--text-primary)" }}
            /*                  ^^^^^^^^^^^^^^^^^ FIX: was --text-secondary
                                Too light to read against dark bg */
          >
            Verdant lets you describe architecture using a readable syntax and
            automatically generate interactive diagrams that help you{" "}
            <span style={{ color: "var(--accent)" }}>explore</span> systems,
            relationships, and infrastructure visually.
          </p>
        </div>

        {/* FIX: btn-group was getting px-4 py-8 border-y directly on it.
            The .btn-group CSS uses background: var(--border) for the gap trick,
            so padding on it turns into a visible colored rectangle.
            Solution: wrapper div gets the spacing + border, btn-group stays tight */}
        <div
          className="px-4 py-8 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="btn-group">
            <Link href="/playground" className="btn-primary group">
              Open Playground
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a href="#features" className="btn-secondary">
              Documentation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}