"use client";

import React from "react";
import {
  DocSection,
  DocSubsection,
  DocParagraph,
  CodeBlock,
  InlineCode,
  DocTable,
  DocNote,
} from "../DocSection";

export function GroupsSection() {
  return (
    <>
      <DocSection title="Groups">
        <DocParagraph>
          Groups are visual containers that organize related nodes. They render as semi-transparent bounding boxes with wireframe borders.
        </DocParagraph>
      </DocSection>

      <DocSection title="Basic Group">
        <CodeBlock
          code={`group backend "Backend Services":
  server api:
    label: "API Gateway"
  database db:
    label: "User Database"`}
        />
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            The group ID (<InlineCode>backend</InlineCode>) is required
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            The label (<InlineCode>"Backend Services"</InlineCode>) is optional (in quotes)
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            The colon (<InlineCode>:</InlineCode>) opens the group block
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Nodes declared inside inherit the group as a parent
          </li>
        </ul>
      </DocSection>

      <DocSection title="Group Properties">
        <CodeBlock
          code={`group backend "Backend Services":
  collapsed: true
  layout: grid
  color: #3b82f6
  style: dashed`}
        />
        <DocTable
          headers={["Property", "Type", "Default", "Description"]}
          rows={[
            ["collapsed", "boolean", "false", "Collapse to proxy node"],
            ["layout", "enum", "—", "Override layout for children"],
            ["color", "string", "—", "Border and tint color"],
            ["style", "string", "—", "Border style"],
            ["label", "string", "—", "Override the inline label"],
          ]}
        />
      </DocSection>

      <DocSection title="Nested Groups">
        <DocParagraph>
          Groups can nest to arbitrary depth (up to 64 levels):
        </DocParagraph>
        <CodeBlock
          code={`group cloud "AWS":
  group vpc "Production VPC":
    group subnet-a "Subnet A":
      server api-1
      server api-2
    group subnet-b "Subnet B":
      database primary-db
      database replica-db`}
        />
        <DocNote>
          Each nesting level automatically adjusts color darkness, opacity, and bounding box size.
        </DocNote>
      </DocSection>

      <DocSection title="Node IDs in Groups">
        <DocParagraph>
          Nodes declared inside a group receive a qualified ID prefixed with the group ID:
        </DocParagraph>
        <CodeBlock
          code={`group backend:
  server api        # actual ID: "backend.api"
  database db       # actual ID: "backend.db"

# Edge references must use the full qualified ID:
backend.api -> backend.db: "queries"`}
        />
      </DocSection>

      <DocSection title="Collapsed Groups">
        <DocParagraph>
          When <InlineCode>collapsed: true</InlineCode>, the group renders as a single proxy cube node showing the group label and child count:
        </DocParagraph>
        <CodeBlock
          code={`group backend "Backend (3 services)":
  collapsed: true
  server api
  server auth
  server billing`}
        />
        <DocParagraph>
          The proxy node shows:
        </DocParagraph>
        <ul className="space-y-2 list-disc list-inside ml-4">
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            ▸ indicator (collapsed)
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Group label
          </li>
          <li className="font-body text-base leading-7 text-[color:var(--text-secondary)]">
            Child count badge
          </li>
        </ul>
      </DocSection>
    </>
  );
}
