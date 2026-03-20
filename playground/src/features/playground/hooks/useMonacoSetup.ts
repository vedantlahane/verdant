"use client";

import { useEffect } from "react";
import { useMonaco } from "@monaco-editor/react";
import { VrdParseResult } from "@verdant/parser";
import {
  NODE_TYPES,
  CONFIG_KEYS,
  PROP_KEYS,
  THEME_VALUES,
  LAYOUT_VALUES,
  SIZE_VALUES,
  BOOL_VALUES,
} from "@/features/playground/constants";

export function useMonacoSetup(
  editorRef: React.MutableRefObject<any>,
  resolvedTheme: string,
  parseResult: VrdParseResult,
  code: string
) {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;
    if (
      monaco.languages.getLanguages().some((l: { id: string }) => l.id === "vrd")
    )
      return;

    monaco.languages.register({ id: "vrd" });

    monaco.languages.setMonarchTokensProvider("vrd", {
      tokenizer: {
        root: [
          [/#.*$/, "comment"],
          [/\bgroup\b/, "keyword"],
          [new RegExp(`\\b(${NODE_TYPES.join("|")})\\b`), "keyword"],
          [new RegExp(`\\b(${CONFIG_KEYS.join("|")})\\b`), "config"],
          [new RegExp(`\\b(${PROP_KEYS.join("|")})\\b`), "property"],
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

    // Autocomplete
    monaco.languages.registerCompletionItemProvider("vrd", {
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

        if (before === "" || before === word.word) {
          NODE_TYPES.forEach((t) =>
            suggestions.push({
              label: t,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: `${t} `,
              detail: "Component",
              range,
            })
          );
          suggestions.push({
            label: "group",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'group ${1:id} "${2:Label}":\n  ',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Group block",
            range,
          });
          CONFIG_KEYS.forEach((k) =>
            suggestions.push({
              label: k,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: `${k}: `,
              detail: "Config",
              range,
            })
          );
          return { suggestions };
        }

        if (/^[\w.-]+\s+[\w.-]+\s*$/.test(before)) {
          suggestions.push({
            label: "->",
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: "-> ",
            detail: "Connect",
            range,
          });
        }

        if (before.includes("->")) {
          const ids = new Set<string>();
          model
            .getValue()
            .split("\n")
            .forEach((l: string) => {
              const m = l
                .trim()
                .match(new RegExp(`^(${NODE_TYPES.join("|")})\\s+([\\w-]+)`));
              if (m) ids.add(m[2]);
            });
          ids.forEach((id) =>
            suggestions.push({
              label: id,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: id,
              detail: "Node",
              range,
            })
          );
        }

        if (/^\s+/.test(line) && !before.includes(":")) {
          PROP_KEYS.forEach((p) =>
            suggestions.push({
              label: p,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: `${p}: `,
              range,
            })
          );
        }

        if (/theme:\s*/.test(before))
          THEME_VALUES.forEach((v) =>
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            })
          );
        if (/layout:\s*/.test(before))
          LAYOUT_VALUES.forEach((v) =>
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            })
          );
        if (/size:\s*/.test(before))
          SIZE_VALUES.forEach((v) =>
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            })
          );
        if (/glow:\s*/.test(before))
          BOOL_VALUES.forEach((v) =>
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            })
          );

        return { suggestions };
      },
    });

    // Themes
    monaco.editor.defineTheme("verdant-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "52B788", fontStyle: "bold" },
        { token: "operator", foreground: "FFFFFF", fontStyle: "bold" },
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
  }, [monaco]);

  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(
        resolvedTheme === "dark" ? "verdant-dark" : "verdant-light"
      );
    }
  }, [monaco, resolvedTheme]);

  useEffect(() => {
    if (!monaco || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = parseResult.diagnostics
      .filter((d) => d.line > 0)
      .map((d) => ({
        startLineNumber: d.line,
        startColumn: 1,
        endLineNumber: d.line,
        endColumn: model.getLineLength(d.line) + 1,
        message: d.message,
        severity:
          d.severity === "error"
            ? monaco.MarkerSeverity.Error
            : d.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
      }));

    monaco.editor.setModelMarkers(model, "verdant", markers);
  }, [monaco, parseResult.diagnostics, code, editorRef]);

  return monaco;
}
