"use client";

import React from "react";
import {
  DocSection,
  DocParagraph,
  CodeBlock,
  InlineCode,
  DocTable,
} from "../DocSection";

export function ShapesSection() {
  return (
    <>
      <DocSection title="Shapes">
        <DocParagraph>
          Every node renders as a 3D shape. The shape is determined by:
        </DocParagraph>
        <ol className="space-y-2 list-decimal list-inside ml-4">
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Explicit <InlineCode>shape:</InlineCode> property on the node (highest priority)
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Default shape mapping for the node type
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Fallback to cube
          </li>
        </ol>
      </DocSection>

      <DocSection title="Available Shapes">
        <DocTable
          headers={["Shape", "Geometry", "Typical Usage"]}
          rows={[
            ["cube", "Box 1×1×1", "Compute, services"],
            ["sphere", "Sphere r=0.7", "Clients, users"],
            ["cylinder", "Cylinder r=0.5, h=1", "Storage, databases"],
            ["diamond", "Octahedron r=0.7", "Gateways, routers"],
            ["torus", "Torus r=0.5, tube=0.2", "Messaging, queues"],
            ["hexagon", "6-sided cylinder", "Caches, monitoring"],
            ["pentagon", "5-sided cylinder", "Functions, lambdas"],
            ["octagon", "8-sided cylinder", "Security, firewalls"],
            ["ring", "Thin torus r=0.5, tube=0.08", "Infrastructure, networks"],
            ["box", "Box 1×1×1 (alt color)", "Containers, VMs"],
            ["cone", "Cone r=0.5, h=1", "Funnels, filters"],
            ["capsule", "Capsule r=0.3, l=0.8", "Pills, processes"],
            ["icosahedron", "Icosahedron r=0.7", "Complex nodes"],
            ["plane", "Flat plane 1×1", "Labels, cards"],
          ]}
        />
      </DocSection>

      <DocSection title="Overriding Shape">
        <CodeBlock
          code={`# Default: gateway renders as diamond
gateway api-gw

# Override: render gateway as a sphere instead
gateway api-gw:
  shape: sphere`}
        />
      </DocSection>
    </>
  );
}
