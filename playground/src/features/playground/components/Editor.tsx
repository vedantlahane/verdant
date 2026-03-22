// features/playground/components/Editor.tsx

"use client";

import { memo } from "react";
import MonacoEditor from "@monaco-editor/react";
import type { ComponentProps } from "react";

type EditorMount = NonNullable<ComponentProps<typeof MonacoEditor>["onMount"]>;

/** Monaco editor instance — used by useMonacoMarkers for model access */
export type EditorInstance = Parameters<EditorMount>[0];

interface EditorProps {
  readonly code: string;
  readonly onChange: (value: string | undefined) => void;
  readonly onMount: EditorMount;
  readonly theme: string;
}

/** Monaco editor options — frozen module-level constant (pattern 8) */
const EDITOR_OPTIONS = Object.freeze({
  minimap: Object.freeze({ enabled: false }),
  fontSize: 13,
  fontFamily: "var(--font-mono)",
  lineNumbers: "on" as const,
  selectionHighlight: true,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: Object.freeze({ top: 12, bottom: 12 }),
  cursorSmoothCaretAnimation: "on" as const,
  smoothScrolling: true,
  wordWrap: "on" as const,
  lineHeight: 1.7,
  glyphMargin: false,
  folding: true,
  renderLineHighlight: "all" as const,
  overviewRulerBorder: false,
  scrollbar: Object.freeze({
    verticalScrollbarSize: 6,
    horizontalScrollbarSize: 6,
  }),
  accessibilitySupport: "on" as const,
  ariaLabel: "Verdant schema editor",
});

/**
 * Thin wrapper around Monaco editor configured for .vrd language.
 *
 * Memoized — only re-renders when code content or theme changes.
 * `onChange` and `onMount` are compared by reference; callers
 * should stabilize them with `useCallback`.
 */
export const Editor = memo(function Editor({
  code,
  onChange,
  onMount,
  theme,
}: EditorProps) {
  return (
    <MonacoEditor
      height="100%"
      language="vrd"
      value={code}
      theme={theme === "dark" ? "verdant-dark" : "verdant-light"}
      options={EDITOR_OPTIONS}
      onChange={onChange}
      onMount={onMount}
    />
  );
},
function editorPropsAreEqual(prev, next) {
  return (
    prev.code === next.code &&
    prev.theme === next.theme &&
    prev.onChange === next.onChange &&
    prev.onMount === next.onMount
  );
});