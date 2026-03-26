"use client";

import React from "react";
import {
  DocSection,
  DocParagraph,
  CodeBlock,
  InlineCode,
  DocTable,
} from "../DocSection";

export function AnimationsSection() {
  return (
    <>
      <DocSection title="Animations">
        <DocParagraph>
          Verdant supports node enter/exit animations and custom animation timelines.
        </DocParagraph>
      </DocSection>

      <DocSection title="Node Enter/Exit Animations">
        <DocParagraph>
          Individual nodes can specify mount and unmount animations:
        </DocParagraph>
        <CodeBlock
          code={`server api:
  enter: scale              # scale up from zero on mount
  exit: fade                # fade out on unmount
  animation-duration: 500   # 500ms duration`}
        />
        <DocTable
          headers={["Animation", "Enter Behavior", "Exit Behavior"]}
          rows={[
            ["fade", "Fade in from transparent", "Fade out to transparent"],
            ["scale", "Scale up from zero (with smoothstep easing)", "Scale down to zero"],
            ["slide", "Slide up from below", "Slide down and out"],
          ]}
        />
      </DocSection>

      <DocSection title="Animation Timelines">
        <DocParagraph>
          Define reusable animation sequences in the config section:
        </DocParagraph>
        <CodeBlock
          code={`animation pulse:
  duration: 2000
  target: api
  property: opacity
  from: 1.0
  to: 0.5
  target: api
  property: scale
  from: 1.0
  to: 1.1`}
        />
        <DocParagraph>
          Timeline structure:
        </DocParagraph>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            <InlineCode>duration</InlineCode> — total duration in milliseconds
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Each keyframe requires <InlineCode>target</InlineCode>, <InlineCode>property</InlineCode>, <InlineCode>from</InlineCode>, and <InlineCode>to</InlineCode>
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            The <InlineCode>to</InlineCode> field finalizes and flushes the current keyframe
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Multiple keyframes can be defined sequentially
          </li>
        </ul>
      </DocSection>
    </>
  );
}
