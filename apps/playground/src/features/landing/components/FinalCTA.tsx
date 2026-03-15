"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="pattern-topo grid-section">
      <div className="mx-auto max-w-[1200px] px-6 py-28 md:py-36">
        <h2 className="font-display max-w-[700px] text-4xl sm:text-5xl md:text-6xl">
          Your systems are <span style={{ color: "var(--accent)" }}>alive</span>.
          <br />
          Let them look like it.
        </h2>
        <div className="mt-12">
          <Link href="/playground" className="btn-primary group">
            Open Playground
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
