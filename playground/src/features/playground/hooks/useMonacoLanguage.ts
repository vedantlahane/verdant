// features/playground/hooks/useMonacoLanguage.ts

"use client";

import { useEffect, useRef } from "react";
import { useMonaco } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
interface IDisposable {
  dispose(): void;
}
import {
  NODE_TYPES,
  CONFIG_KEYS,
  PROP_KEYS,
  NODE_TYPES_PATTERN,
  CONFIG_KEYS_PATTERN,
  PROP_KEYS_PATTERN,
  NODE_LINE_REGEX,
  VALUE_COMPLETIONS,
} from "../constants/editor";

/**
 * Registers the .vrd language with Monaco ONCE per app lifecycle.
 *
 * Handles:
 * - Monarch tokenizer (syntax highlighting)
 * - Completion provider (autocomplete)
 * - Dark + light theme definitions
 *
 * Returns the Monaco instance for downstream hooks.
 */
export function useMonacoLanguage(): Monaco | null {
  const monaco = useMonaco();
  const registeredRef = useRef(false);
  const disposablesRef = useRef<IDisposable[]>([]);

  useEffect(() => {
    if (!monaco || registeredRef.current) return;
    registeredRef.current = true;

    // ── Register language ──────────────────────────
    monaco.languages.register({ id: "vrd" });

    // ── Syntax highlighting (Monarch) ─────────────
    monaco.languages.setMonarchTokensProvider("vrd", {
      tokenizer: {
        root: [
          [/#.*$/, "comment"],
          [/\bgroup\b/, "keyword"],
          [new RegExp(`\\b(${NODE_TYPES_PATTERN})\\b`), "keyword"],
          [new RegExp(`\\b(${CONFIG_KEYS_PATTERN})\\b`), "config"],
          [new RegExp(`\\b(${PROP_KEYS_PATTERN})\\b`), "property"],
          [/<->/, "operator.bidirectional"],
          [/->/, "operator"],
          [/:/, "delimiter"],
          [/"/, "string", "@string"],
          [/\b(true|false)\b/, "constant"],
          [/#[0-9a-fA-F]{3,8}\b/, "number.hex"],
          [/\b\d+(\.\d+)?\b/, "number"],
        ],
        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],
      },
    });

    // ── Autocomplete ──────────────────────────────
    const completionDisposable = monaco.languages.registerCompletionItemProvider(
      "vrd",
      {
        triggerCharacters: [" ", ":", "\n"],
        provideCompletionItems(model, position) {
          const line = model.getLineContent(position.lineNumber);
          const before = line.substring(0, position.column - 1).trimStart();
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: Array<{
            label: string;
            kind: number;
            insertText: string;
            insertTextRules?: number;
            detail?: string;
            range: typeof range;
          }> = [];

          const Kind = monaco.languages.CompletionItemKind;
          const SnippetRule =
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

          // ── Empty line / start of identifier → node types + group + config
          if (before === "" || before === word.word) {
            for (const t of NODE_TYPES) {
              suggestions.push({
                label: t,
                kind: Kind.Keyword,
                insertText: `${t} `,
                detail: "Node type",
                range,
              });
            }
            suggestions.push({
              label: "group",
              kind: Kind.Keyword,
              insertText: 'group ${1:id} "${2:Label}":\n  ',
              insertTextRules: SnippetRule,
              detail: "Group block",
              range,
            });
            for (const k of CONFIG_KEYS) {
              suggestions.push({
                label: k,
                kind: Kind.Property,
                insertText: `${k}: `,
                detail: "Config",
                range,
              });
            }
            return { suggestions };
          }

          // ── After identifier pair → suggest edge operators
          if (/^[\w.-]+\s+[\w.-]+\s*$/.test(before)) {
            suggestions.push(
              {
                label: "->",
                kind: Kind.Operator,
                insertText: "-> ",
                detail: "Directed edge",
                range,
              },
              {
                label: "<->",
                kind: Kind.Operator,
                insertText: "<-> ",
                detail: "Bidirectional edge",
                range,
              },
            );
          }

          // ── After edge operator → suggest node IDs from document
          if (before.includes("->") || before.includes("<->")) {
            const ids = new Set<string>();
            const lines = model.getValue().split("\n");
            for (const l of lines) {
              const m = l.match(NODE_LINE_REGEX);
              if (m) ids.add(m[1]);
            }
            for (const id of ids) {
              suggestions.push({
                label: id,
                kind: Kind.Variable,
                insertText: id,
                detail: "Node",
                range,
              });
            }
          }

          // ── Indented line → suggest properties
          if (/^\s+/.test(line) && !before.includes(":")) {
            for (const p of PROP_KEYS) {
              suggestions.push({
                label: p,
                kind: Kind.Property,
                insertText: `${p}: `,
                range,
              });
            }
          }

          // ── Value completions after specific property keys
          for (const { pattern, values } of VALUE_COMPLETIONS) {
            if (pattern.test(before)) {
              for (const v of values) {
                suggestions.push({
                  label: v,
                  kind: Kind.Value,
                  insertText: v,
                  range,
                });
              }
            }
          }

          return { suggestions };
        },
      },
    );

    disposablesRef.current.push(completionDisposable);

    // ── Theme: Dark ───────────────────────────────
    monaco.editor.defineTheme("verdant-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "52B788", fontStyle: "bold" },
        { token: "operator", foreground: "FFFFFF", fontStyle: "bold" },
        { token: "operator.bidirectional", foreground: "64b5f6", fontStyle: "bold" },
        { token: "delimiter", foreground: "6B7280" },
        { token: "property", foreground: "74C69D" },
        { token: "config", foreground: "95D5B2", fontStyle: "bold" },
        { token: "string", foreground: "B7E4C7" },
        { token: "comment", foreground: "4A6E5C", fontStyle: "italic" },
        { token: "constant", foreground: "FDE68A" },
        { token: "number", foreground: "FDE68A" },
        { token: "number.hex", foreground: "C4B5FD" },
      ],
      colors: {
        "editor.background": "#00000000",
        "editor.foreground": "#D8F3DC",
        "editorLineNumber.foreground": "#4A6E5C",
        "editorLineNumber.activeForeground": "#52B788",
        "editor.selectionBackground": "#2D6A4F44",
        "editor.lineHighlightBackground": "#1A332811",
        "editorCursor.foreground": "#52B788",
        "editorSuggestWidget.background": "#0D1F17",
        "editorSuggestWidget.border": "#1A3328",
        "editorSuggestWidget.selectedBackground": "#1A3328",
      },
    });

    // ── Theme: Light ──────────────────────────────
    monaco.editor.defineTheme("verdant-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "2D6A4F", fontStyle: "bold" },
        { token: "operator", foreground: "111827", fontStyle: "bold" },
        { token: "operator.bidirectional", foreground: "1565c0", fontStyle: "bold" },
        { token: "delimiter", foreground: "9CA3AF" },
        { token: "property", foreground: "40916C" },
        { token: "config", foreground: "2D6A4F", fontStyle: "bold" },
        { token: "string", foreground: "5F8F75" },
        { token: "comment", foreground: "7A8F80", fontStyle: "italic" },
        { token: "constant", foreground: "B45309" },
        { token: "number.hex", foreground: "7C3AED" },
      ],
      colors: {
        "editor.background": "#00000000",
        "editor.foreground": "#17311F",
        "editorLineNumber.foreground": "#7A8F80",
        "editorLineNumber.activeForeground": "#2D6A4F",
        "editor.selectionBackground": "#2D6A4F22",
        "editorCursor.foreground": "#2D6A4F",
      },
    });

    // ── Cleanup ───────────────────────────────────
    return () => {
      const toDispose = disposablesRef.current.splice(0);
      for (const d of toDispose) {
        d.dispose();
      }
    };
  }, [monaco]);

  return monaco;
}