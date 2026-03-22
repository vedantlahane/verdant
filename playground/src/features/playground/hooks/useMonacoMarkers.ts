// features/playground/hooks/useMonacoMarkers.ts

"use client";

import { useEffect } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { VrdParseResult } from "@verdant/parser";
import type { EditorInstance } from "../components/Editor";

/**
 * Syncs parser diagnostics → Monaco editor markers.
 * Separated from language registration so it runs on every parse.
 */
export function useMonacoMarkers(
  monaco: Monaco | null,
  editorRef: React.RefObject<EditorInstance | null>,
  parseResult: VrdParseResult,
): void {
  useEffect(() => {
    if (!monaco || !editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const diagnostics = parseResult.diagnostics;

    // Build markers from diagnostics that have valid line numbers
    const markers = diagnostics
      .filter((d) => d.line > 0)
      .map((d) => {
        const lineLength = model.getLineLength(d.line);
        return {
          startLineNumber: d.line,
          startColumn: d.col ?? 1,
          endLineNumber: d.line,
          endColumn: lineLength + 1,
          message: d.message,
          severity:
            d.severity === "error"
              ? monaco.MarkerSeverity.Error
              : d.severity === "warning"
                ? monaco.MarkerSeverity.Warning
                : monaco.MarkerSeverity.Info,
        };
      });

    monaco.editor.setModelMarkers(model, "verdant", markers);
  }, [monaco, parseResult.diagnostics, editorRef]);
}