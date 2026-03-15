"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COMPONENTS } from "../constants";

export function ComponentsSection() {
  return (
    <section className="grid-section">
      <div className="mx-auto ">
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="section-label">// components</span>
        </div>

        <div className="px-6 py-14">
          <h2 className="font-display max-w-[500px] text-4xl sm:text-5xl">
            Pieces that fit.
          </h2>
          <p
            className="font-body mt-4 max-w-md text-sm leading-7"
            style={{ color: "var(--text-secondary)" }}
          >
            Pre-built 3D nodes for the infrastructure you actually work with.
            Type the name, it appears.
          </p>
        </div>

        <div
          className="grid-lines grid-cols-2 sm:grid-cols-5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {COMPONENTS.map((c) => (
            <div key={c} className="component-cell">
              <span
                className="font-mono text-lg"
                style={{ color: "var(--text-muted)" }}
              >
                ◇
              </span>
              <span className="component-cell-label">{c}</span>
            </div>
          ))}
        </div>

        <div
          className="px-6 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 text-sm"
            style={{ color: "var(--accent)" }}
          >
            Try them in the playground <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
