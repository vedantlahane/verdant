"use client";

import { useEffect } from "react";
import type { VrdParseResult } from "@verdant/parser";

/**
 * Syncs parser diagnostics → Monaco editor markers.
 * Separated from language registration so it runs on every parse.
 */
export function useMonacoMarkers(
  monaco: any,
  editorRef: React.MutableRefObject<any>,
  parseResult: VrdParseResult,
): void {
  useEffect(() => {
    if (!monaco || !editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = parseResult.diagnostics
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