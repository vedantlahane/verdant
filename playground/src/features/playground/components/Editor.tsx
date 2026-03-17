"use client";

import MonacoEditor from "@monaco-editor/react";
import { type ComponentProps } from "react";

type EditorMount = NonNullable<ComponentProps<typeof MonacoEditor>["onMount"]>;
export type EditorInstance = Parameters<EditorMount>[0];

interface EditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  onMount: EditorMount;
  theme: string;
}

export function Editor({ code, onChange, onMount, theme }: EditorProps) {
  return (
    <MonacoEditor
      height="100%"
      language="vrd"
      value={code}
      theme={theme === "dark" ? "verdant-dark" : "verdant-light"}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        lineNumbers: "on",
        selectionHighlight: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        wordWrap: "on",
        lineHeight: 1.7,
        glyphMargin: false,
        folding: true,
        renderLineHighlight: "all",
        overviewRulerBorder: false,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
      onChange={onChange}
      onMount={onMount}
    />
  );
}