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

export function ConfigurationSection() {
  return (
    <>
      <DocSection title="Configuration">
        <DocParagraph>
          Top-level key-value pairs (outside any node, edge, or group block) are treated as scene configuration.
        </DocParagraph>
        <CodeBlock
          code={`theme: dark
layout: hierarchical
camera: perspective
minimap: true
post-processing: true
bloom-intensity: 0.8
snap-to-grid: true
grid-size: 1.5
direction: top-down
layer-spacing: 4
node-spacing: 3`}
        />
      </DocSection>

      <DocSection title="Configuration Keys">
        <DocTable
          headers={["Key", "Type", "Default", "Description"]}
          rows={[
            ["theme", "string", "—", "Theme identifier"],
            ["layout", "enum", "—", "Auto-layout algorithm"],
            ["camera", "enum", "—", "Camera projection type"],
            ["minimap", "boolean", "false", "Show minimap overlay"],
            ["post-processing", "boolean", "false", "Enable bloom/outline effects"],
            ["bloom-intensity", "number", "1.0", "Bloom effect intensity"],
            ["snap-to-grid", "boolean", "false", "Snap node positions to grid"],
            ["grid-size", "number", "1.0", "Grid cell size (world units)"],
            ["direction", "string", '"top-down"', "Layout direction"],
            ["layer-spacing", "number", "3", "Space between hierarchy layers"],
            ["node-spacing", "number", "3", "Space between nodes in a layer"],
          ]}
        />
      </DocSection>

      <DocSection title="Layout Types">
        <CodeBlock
          code={`layout: auto            # engine decides
layout: grid            # nodes in a regular grid
layout: circular        # nodes arranged in a circle
layout: hierarchical    # Sugiyama layered layout
layout: forced          # force-directed physics simulation`}
        />
      </DocSection>

      <DocSection title="Camera Types">
        <CodeBlock
          code={`camera: perspective     # 3D perspective projection (default)
camera: orthographic    # flat orthographic projection`}
        />
      </DocSection>

      <DocSection title="Layout Direction">
        <DocParagraph>
          When using <InlineCode>layout: hierarchical</InlineCode>, the direction key controls flow:
        </DocParagraph>
        <CodeBlock
          code={`direction: top-down     # root at top, leaves at bottom (default)
direction: bottom-up    # root at bottom
direction: left-right   # root at left, leaves at right
direction: right-left   # root at right`}
        />
      </DocSection>
    </>
  );
}
