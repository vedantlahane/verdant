"use client";

import { useEffect, useRef } from "react";
import { useMonaco } from "@monaco-editor/react";
import {
  NODE_TYPES,
  CONFIG_KEYS,
  PROP_KEYS,
  THEME_VALUES,
  LAYOUT_VALUES,
  SIZE_VALUES,
  EDGE_STYLE_VALUES,
  BOOL_VALUES,
} from "../constants/editor";

/**
 * Registers the .vrd language with Monaco ONCE.
 * Handles: syntax highlighting, autocomplete, theme definitions.
 * Returns the monaco instance.
 */
export function useMonacoLanguage() {
  const monaco = useMonaco();
  const registeredRef = useRef(false);
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);

  useEffect(() => {
    if (!monaco || registeredRef.current) return;
    registeredRef.current = true;

    // ── Register language ──
    monaco.languages.register({ id: "vrd" });

    // ── Syntax highlighting ──
    const nodeTypesPattern = NODE_TYPES.join("|");
    const configKeysPattern = CONFIG_KEYS.join("|");
    const propKeysPattern = PROP_KEYS.join("|");

    monaco.languages.setMonarchTokensProvider("vrd", {
      tokenizer: {
        root: [
          [/#.*$/, "comment"],
          [/\bgroup\b/, "keyword"],
          [new RegExp(`\\b(${nodeTypesPattern})\\b`), "keyword"],
          [new RegExp(`\\b(${configKeysPattern})\\b`), "config"],
          [new RegExp(`\\b(${propKeysPattern})\\b`), "property"],
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

    // ── Autocomplete ──
    const completionDisposable = monaco.languages.registerCompletionItemProvider("vrd", {
      triggerCharacters: [" ", ":", "\n"],
      provideCompletionItems: (model: any, position: any) => {
        const line = model.getLineContent(position.lineNumber);
        const before = line.substring(0, position.column - 1).trimStart();
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions: any[] = [];

        // Empty line or start of identifier → node types + group + config
        if (before === "" || before === word.word) {
          for (const t of NODE_TYPES) {
            suggestions.push({
              label: t,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: `${t} `,
              detail: "Node type",
              range,
            });
          }
          suggestions.push({
            label: "group",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'group ${1:id} "${2:Label}":\n  ',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Group block",
            range,
          });
          for (const k of CONFIG_KEYS) {
            suggestions.push({
              label: k,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: `${k}: `,
              detail: "Config",
              range,
            });
          }
          return { suggestions };
        }

        // After identifier pair → suggest edge operator
        if (/^[\w.-]+\s+[\w.-]+\s*$/.test(before)) {
          suggestions.push(
            {
              label: "->",
              kind: monaco.languages.CompletionItemKind.Operator,
              insertText: "-> ",
              detail: "Directed edge",
              range,
            },
            {
              label: "<->",
              kind: monaco.languages.CompletionItemKind.Operator,
              insertText: "<-> ",
              detail: "Bidirectional edge",
              range,
            },
          );
        }

        // After edge operator → suggest node IDs
        if (before.includes("->") || before.includes("<->")) {
          const ids = new Set<string>();
          const nodeLineRe = new RegExp(
            `^\\s*(?:${nodeTypesPattern})\\s+([\\w][\\w.-]*)`,
          );
          for (const l of model.getValue().split("\n")) {
            const m = l.match(nodeLineRe);
            if (m) ids.add(m[1]);
          }
          for (const id of ids) {
            suggestions.push({
              label: id,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: id,
              detail: "Node",
              range,
            });
          }
        }

        // Indented line → suggest properties
        if (/^\s+/.test(line) && !before.includes(":")) {
          for (const p of PROP_KEYS) {
            suggestions.push({
              label: p,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: `${p}: `,
              range,
            });
          }
        }

        // Value completions after specific keys
        const valueCompletions: [RegExp, string[]][] = [
          [/theme:\s*/, THEME_VALUES],
          [/layout:\s*/, LAYOUT_VALUES],
          [/size:\s*/, SIZE_VALUES],
          [/glow:\s*/, BOOL_VALUES],
          [/style:\s*/, EDGE_STYLE_VALUES],
          [/bidirectional:\s*/, BOOL_VALUES],
        ];

        for (const [pattern, values] of valueCompletions) {
          if (pattern.test(before)) {
            for (const v of values) {
              suggestions.push({
                label: v,
                kind: monaco.languages.CompletionItemKind.Value,
                insertText: v,
                range,
              });
            }
          }
        }

        return { suggestions };
      },
    });

    disposablesRef.current.push(completionDisposable);

    // ── Themes ──
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

    // Cleanup on unmount
    return () => {
      for (const d of disposablesRef.current) {
        d.dispose();
      }
      disposablesRef.current = [];
    };
  }, [monaco]);

  return monaco;
}