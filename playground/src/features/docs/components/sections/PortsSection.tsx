"use client";

import React from "react";
import {
  DocSection,
  DocParagraph,
  CodeBlock,
  InlineCode,
  DocTable,
} from "../DocSection";

export function PortsSection() {
  return (
    <>
      <DocSection title="Ports">
        <DocParagraph>
          Ports define named connection points on specific sides of a node. They enable precise edge routing and visual port indicators.
        </DocParagraph>
      </DocSection>

      <DocSection title="Declaring Ports">
        <CodeBlock
          code={`server api:
  port http-in: top
  port http-out: bottom
  port db-conn: right
  port cache-conn: left
  port metrics: back
  port config: front`}
        />
      </DocSection>

      <DocSection title="Port Sides">
        <DocTable
          headers={["Side", "Direction"]}
          rows={[
            ["top", "+Y (up)"],
            ["bottom", "-Y (down)"],
            ["left", "-X"],
            ["right", "+X"],
            ["front", "+Z (toward camera)"],
            ["back", "-Z (away from camera)"],
          ]}
        />
      </DocSection>

      <DocSection title="Connecting Ports">
        <DocParagraph>
          Use dot notation in edge declarations:
        </DocParagraph>
        <CodeBlock
          code={`server api:
  port http-out: bottom
  port cache-conn: right

database db:
  port http-in: top

cache redis:
  port data-in: left

api.http-out -> db.http-in: "SQL"
api.cache-conn -> redis.data-in: "cache reads"`}
        />
      </DocSection>

      <DocSection title="Port Visual Behavior">
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Ports are invisible by default
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            When the parent node is hovered, port indicators fade in as small colored spheres
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Hovering an individual port shows a tooltip with the port name
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Port colors indicate direction by convention (green = input, red = output, blue = bidirectional)
          </li>
        </ul>
      </DocSection>
    </>
  );
}
