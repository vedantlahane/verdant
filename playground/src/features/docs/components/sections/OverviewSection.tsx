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

export function OverviewSection() {
  return (
    <>
      <DocSection title="Overview">
        <DocParagraph>
          Verdant (<InlineCode>.vrd</InlineCode>) is an indentation-based declarative language for describing 3D graph visualizations. 
          It compiles to an abstract syntax tree (AST) consumed by the <InlineCode>@verdant/primitives</InlineCode> rendering library.
        </DocParagraph>

        <DocParagraph>
          A <InlineCode>.vrd</InlineCode> file describes three things:
        </DocParagraph>

        <ul className="space-y-2 list-disc list-inside ml-4">
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            <strong className="text-[color:var(--text-primary)]">Nodes</strong> — entities in the graph (servers, databases, users, etc.)
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            <strong className="text-[color:var(--text-primary)]">Edges</strong> — connections between nodes (data flows, dependencies, etc.)
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            <strong className="text-[color:var(--text-primary)]">Groups</strong> — visual containers that organize nodes hierarchically
          </li>
        </ul>

        <CodeBlock
          code={`# A minimal .vrd file
layout: hierarchical

server api
database db

api -> db: "queries"`}
        />
      </DocSection>

      <DocSection title="Design Principles">
        <DocTable
          headers={["Principle", "Description"]}
          rows={[
            ["Readable", "Looks like pseudocode, not markup"],
            ["Indent-scoped", "No braces or closing tags — indentation defines nesting"],
            ["Incremental", "Every property is optional — start simple, add detail later"],
            ["Non-throwing", "The parser collects diagnostics instead of crashing on first error"],
          ]}
        />
      </DocSection>

      <DocSection title="Quick Start">
        <DocSubsection title="1. Create a file">
          <DocParagraph>
            Create a new file with the <InlineCode>.vrd</InlineCode> extension:
          </DocParagraph>
          <CodeBlock code="my-architecture.vrd" language="bash" />
        </DocSubsection>

        <DocSubsection title="2. Define your system">
          <DocParagraph>
            Start with the basics — nodes and connections:
          </DocParagraph>
          <CodeBlock
            code={`server api
database db
cache redis

api -> db: "queries"
api -> redis: "cache lookups"`}
          />
        </DocSubsection>

        <DocSubsection title="3. Add configuration">
          <DocParagraph>
            Customize the layout and appearance:
          </DocParagraph>
          <CodeBlock
            code={`layout: hierarchical
theme: moss
minimap: true

server api
database db

api -> db: "queries"`}
          />
        </DocSubsection>

        <DocSubsection title="4. Enhance with properties">
          <DocParagraph>
            Add colors, labels, and visual effects:
          </DocParagraph>
          <CodeBlock
            code={`server api:
  label: "API Gateway"
  color: #52B788
  size: lg
  status: healthy
  glow: true

database db:
  label: "Main Database"
  status: healthy

api -> db:
  label: "SQL queries"
  style: dashed
  flow: true`}
          />
        </DocSubsection>
      </DocSection>
    </>
  );
}
