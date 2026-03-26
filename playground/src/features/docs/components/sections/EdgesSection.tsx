"use client";

import React from "react";
import {
  DocSection,
  DocSubsection,
  DocParagraph,
  CodeBlock,
  InlineCode,
  DocTable,
} from "../DocSection";

export function EdgesSection() {
  return (
    <>
      <DocSection title="Edges">
        <DocParagraph>
          Edges represent connections between nodes.
        </DocParagraph>
      </DocSection>

      <DocSection title="Directed Edges">
        <CodeBlock
          code={`api -> db                           # simple directed edge
api -> db: "SQL queries"            # with label`}
        />
      </DocSection>

      <DocSection title="Bidirectional Edges">
        <CodeBlock
          code={`api <-> cache                       # simple bidirectional edge
api <-> cache: "read/write"         # with label`}
        />
      </DocSection>

      <DocSection title="Edge Property Blocks">
        <DocParagraph>
          Add a colon after the edge declaration to open a property block:
        </DocParagraph>
        <CodeBlock
          code={`api -> db:
  label: "queries"
  style: dashed
  color: #f59e0b
  width: 2.5
  routing: orthogonal
  flow: true
  flow-speed: 1.5
  flow-count: 8
  flow-color: "#52B788"`}
        />
      </DocSection>

      <DocSection title="Port-to-Port Edges">
        <DocParagraph>
          Connect specific ports on nodes using dot notation:
        </DocParagraph>
        <CodeBlock
          code={`api.http-out -> db.http-in
api.http-out -> db.http-in: "queries"

# With property block
api.http-out -> db.http-in:
  style: animated
  routing: curved
  flow: true

# Bidirectional port-to-port
api.sync-port <-> cache.sync-port: "bidirectional sync"`}
        />
      </DocSection>

      <DocSection title="Edge Properties">
        <DocTable
          headers={["Property", "Type", "Default", "Description"]}
          rows={[
            ["label", "string", "—", "Text displayed at the edge midpoint"],
            ["style", "enum", "solid", "Line style"],
            ["color", "hex string", "#52B788", "Edge color"],
            ["width", "number", "1.5", "Line width in pixels"],
            ["bidirectional", "boolean", "false", "Two-way arrow"],
            ["routing", "enum", "curved", "Path algorithm"],
            ["flow", "boolean", "false", "Enable animated flow particles"],
            ["flow-speed", "number", "2.0", "Particle traversal time (seconds)"],
            ["flow-count", "number", "5", "Number of simultaneous particles"],
            ["flow-color", "string", "edge color", "Particle color"],
          ]}
        />
      </DocSection>

      <DocSection title="Edge Styles">
        <CodeBlock
          code={`api -> db:
  style: solid       # continuous line (default)

api -> cache:
  style: dashed      # long dashes

api -> queue:
  style: dotted      # small dots

api -> monitor:
  style: animated    # moving dashes (animated dash offset)`}
        />
      </DocSection>

      <DocSection title="Routing Algorithms">
        <CodeBlock
          code={`api -> db:
  routing: straight      # direct line between endpoints

api -> cache:
  routing: curved        # quadratic bezier arc (default)

api -> queue:
  routing: orthogonal    # axis-aligned L-shape or Z-shape segments`}
        />
        <DocParagraph>
          The orthogonal router automatically avoids obstacles when possible, falling back to curved if no collision-free path is found.
        </DocParagraph>
      </DocSection>

      <DocSection title="Flow Particles">
        <DocParagraph>
          Animated particles that travel along the edge path, visualizing data flow:
        </DocParagraph>
        <CodeBlock
          code={`api -> db:
  flow: true
  flow-speed: 1.5       # seconds per full traversal
  flow-count: 8          # simultaneous particles
  flow-color: "#22c55e"  # override particle color`}
        />
      </DocSection>
    </>
  );
}
