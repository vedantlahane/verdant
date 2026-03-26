"use client";

import React, { ReactNode } from "react";

interface DocSectionProps {
  title: string;
  children: ReactNode;
}

export function DocSection({ title, children }: DocSectionProps) {
  return (
    <section className="mb-20">
      <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-10 text-[color:var(--text-primary)]">
        {title}
      </h2>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

interface DocSubsectionProps {
  title: string;
  children: ReactNode;
}

export function DocSubsection({ title, children }: DocSubsectionProps) {
  return (
    <div className="mb-12">
      <h3 className="font-ui text-xl md:text-2xl font-medium mb-6 text-[color:var(--text-primary)]">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface DocParagraphProps {
  children: ReactNode;
}

export function DocParagraph({ children }: DocParagraphProps) {
  return (
    <p className="font-body text-base md:text-lg leading-7 md:leading-8 text-[color:var(--text-secondary)]">
      {children}
    </p>
  );
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "vrd" }: CodeBlockProps) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] overflow-hidden my-8">
      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--accent-faint)]">
        <span className="font-mono text-xs tracking-wide text-[color:var(--accent)]">
          {language}
        </span>
      </div>
      <pre className="px-4 py-5 overflow-x-auto bg-[var(--page-bg)]">
        <code className="font-mono text-sm text-[color:var(--text-primary)] leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}

interface InlineCodeProps {
  children: ReactNode;
}

export function InlineCode({ children }: InlineCodeProps) {
  return (
    <code className="font-mono text-sm text-[color:var(--accent)] bg-[var(--accent-faint)] px-2 py-0.5 rounded-sm">
      {children}
    </code>
  );
}

interface DocTableProps {
  headers: string[];
  rows: (string | ReactNode)[][];
}

export function DocTable({ headers, rows }: DocTableProps) {
  return (
    <div className="border border-[var(--border)] overflow-hidden my-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--accent-faint)] border-b border-[var(--border)]">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-mono text-xs tracking-wide text-[color:var(--accent)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--accent-faint)] transition-colors"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-4 py-3.5 font-ui text-sm text-[color:var(--text-secondary)]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DocListProps {
  items: (string | ReactNode)[];
  ordered?: boolean;
}

export function DocList({ items, ordered = false }: DocListProps) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag className={`space-y-3 ${ordered ? "list-decimal" : "list-disc"} list-inside ml-1 my-6`}>
      {items.map((item, i) => (
        <li key={i} className="font-body text-base md:text-lg leading-7 md:leading-8 text-[color:var(--text-secondary)]">
          {item}
        </li>
      ))}
    </ListTag>
  );
}

interface DocNoteProps {
  children: ReactNode;
  type?: "info" | "warning" | "error";
}

export function DocNote({ children, type = "info" }: DocNoteProps) {
  const colors = {
    info: "border-[var(--accent)] bg-[var(--accent-faint)]",
    warning: "border-[#f59e0b] bg-[rgba(245,158,11,0.06)]",
    error: "border-[#ef4444] bg-[rgba(239,68,68,0.06)]",
  };

  return (
    <div className={`border-l-4 ${colors[type]} px-5 py-4 my-6`}>
      <p className="font-body text-sm md:text-base leading-6 md:leading-7 text-[color:var(--text-secondary)]">
        {children}
      </p>
    </div>
  );
}
