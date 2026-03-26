"use client";

import React from "react";
import {
  DocSection,
  DocParagraph,
  InlineCode,
  DocTable,
} from "../DocSection";

export function PropertiesSection() {
  return (
    <>
      <DocSection title="Properties Reference">
        <DocParagraph>
          Complete reference of all available properties for nodes, edges, groups, and configuration.
        </DocParagraph>
      </DocSection>

      <DocSection title="Node Properties">
        <DocTable
          headers={["Property", "Type", "Values", "Default"]}
          rows={[
            ["label", "string", "Any quoted string", "Node ID"],
            ["color", "string", "#RGB, #RRGGBB, #RRGGBBAA", "Shape default"],
            ["size", "enum", "xs, sm, md, lg, xl", "md"],
            ["glow", "boolean", "true, false", "false"],
            ["icon", "string", "Icon identifier", "—"],
            ["position", "vec3", "x,y,z or x y z", "Auto-layout"],
            ["shape", "enum", "See Shapes", "Type default"],
            ["status", "enum", "healthy, warning, error, unknown", "—"],
            ["opacity", "number", "0.0 – 1.0", "1.0"],
            ["scale", "number", "Any positive number", "1.0"],
            ["enter", "enum", "fade, scale, slide", "instant"],
            ["exit", "enum", "fade, scale, slide", "instant"],
            ["animation-duration", "number", "Milliseconds (≥ 0)", "300"],
          ]}
        />
      </DocSection>

      <DocSection title="Edge Properties">
        <DocTable
          headers={["Property", "Type", "Values", "Default"]}
          rows={[
            ["label", "string", "Any quoted string", "—"],
            ["style", "enum", "solid, dashed, dotted, animated", "solid"],
            ["color", "string", "Hex color", "#52B788"],
            ["width", "number", "Positive number", "1.5"],
            ["bidirectional", "boolean", "true, false", "false"],
            ["routing", "enum", "straight, curved, orthogonal", "curved"],
            ["flow", "boolean", "true, false", "false"],
            ["flow-speed", "number", "Positive number (seconds)", "2.0"],
            ["flow-count", "integer", "Positive integer", "5"],
            ["flow-color", "string", "Hex color", "Edge color"],
          ]}
        />
      </DocSection>

      <DocSection title="Group Properties">
        <DocTable
          headers={["Property", "Type", "Values", "Default"]}
          rows={[
            ["label", "string", "Any quoted string", "Group ID"],
            ["collapsed", "boolean", "true, false", "false"],
            ["layout", "enum", "auto, grid, circular, hierarchical, forced", "Inherit"],
            ["color", "string", "Hex color", "#ffffff"],
            ["style", "string", "Border style identifier", "solid"],
          ]}
        />
      </DocSection>

      <DocSection title="Config Properties">
        <DocTable
          headers={["Property", "Type", "Values", "Default"]}
          rows={[
            ["theme", "string", "Theme name", "—"],
            ["layout", "enum", "auto, grid, circular, hierarchical, forced", "—"],
            ["camera", "enum", "perspective, orthographic", "perspective"],
            ["minimap", "boolean", "true, false", "false"],
            ["post-processing", "boolean", "true, false", "false"],
            ["bloom-intensity", "number", "0.0 – ∞", "1.0"],
            ["snap-to-grid", "boolean", "true, false", "false"],
            ["grid-size", "number", "Positive number", "1.0"],
            ["direction", "string", "top-down, bottom-up, left-right, right-left", "top-down"],
            ["layer-spacing", "number", "Positive number", "3"],
            ["node-spacing", "number", "Positive number", "3"],
          ]}
        />
      </DocSection>
    </>
  );
}
