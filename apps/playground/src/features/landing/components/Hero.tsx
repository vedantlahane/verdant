"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="pattern-topo">
      <div className="mx-auto max-w-[1200px] px-6 pb-32 pt-24 sm:pt-32 md:pb-40 md:pt-40">
        <p className="section-label mb-6">// where architecture grows</p>

        <h1 className="font-display max-w-[900px] text-6xl leading-[1.05] sm:text-7xl md:text-[6.5rem] lg:text-[8rem]">
          Breathe.
        </h1>

        <p
          className="font-body mt-8 max-w-lg text-lg leading-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Your architecture is{" "}
          <span style={{ color: "var(--accent)" }}>alive</span>. Let it look
          like it.
        </p>

        <div className="btn-group mt-12">
          <Link href="/playground" className="btn-primary group">
            Open Playground
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#features" className="btn-secondary">
            Documentation
          </a>
        </div>
      </div>
    </section>
  );
}
