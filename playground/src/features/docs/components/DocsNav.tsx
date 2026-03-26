"use client";

import React from "react";
import { LeafRain } from "@/features/shared/ui/LeafRain";

interface DocsNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const NAV_SECTIONS = [
  { id: "overview", label: "Overview", num: "01" },
  { id: "basic-syntax", label: "Basic Syntax", num: "02" },
  { id: "configuration", label: "Configuration", num: "03" },
  { id: "nodes", label: "Nodes", num: "04" },
  { id: "edges", label: "Edges", num: "05" },
  { id: "groups", label: "Groups", num: "06" },
  { id: "ports", label: "Ports", num: "07" },
  { id: "animations", label: "Animations", num: "08" },
  { id: "node-types", label: "Built-in Types", num: "09" },
  { id: "shapes", label: "Shapes", num: "10" },
  { id: "properties", label: "Properties", num: "11" },
  { id: "examples", label: "Examples", num: "12" },
];

export function DocsNav({ activeSection, onSectionChange }: DocsNavProps) {
  return (
    <nav className="flex flex-col h-full">
      {NAV_SECTIONS.map((section) => (
        <LeafRain
          key={section.id}
          className={`group relative px-5 transition-colors h-16 flex items-center ${
            activeSection === section.id
              ? "bg-[var(--accent-faint)]"
              : "hover:bg-[var(--accent-faint)]"
          }`}
        >
          <button
            onClick={() => onSectionChange(section.id)}
            className="w-full text-left flex items-center gap-3 relative z-10"
          >
            <span
              className={`font-mono text-xs transition-colors ${
                activeSection === section.id
                  ? "text-[color:var(--accent)]"
                  : "text-[color:var(--text-muted)] group-hover:text-[color:var(--accent)]"
              }`}
            >
              {section.num}
            </span>
            <span
              className={`font-ui text-sm transition-colors ${
                activeSection === section.id
                  ? "text-[color:var(--text-primary)] font-medium"
                  : "text-[color:var(--text-secondary)] group-hover:text-[color:var(--text-primary)]"
              }`}
            >
              {section.label}
            </span>
            {activeSection === section.id && (
              <span className="ml-auto text-[color:var(--accent)] text-sm">→</span>
            )}
          </button>
        </LeafRain>
      ))}
    </nav>
  );
}
