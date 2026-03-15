"use client";

import { CodeBlock } from "./CodeBlock";
import { CODE_LINES } from "../constants";

export function SyntaxSection() {
  return (
    <section className="grid-section">
      <div className="mx-auto max-w-[1200px]">
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="section-label">// syntax</span>
        </div>

        <div className="px-6 py-14">
          <h2 className="font-display max-w-[600px] text-4xl sm:text-5xl">
            Where code becomes space.
          </h2>
        </div>

        <div
          className="px-6 py-14"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="mx-auto max-w-2xl">
            <CodeBlock lines={CODE_LINES} />
          </div>
        </div>
      </div>
    </section>
  );
}
