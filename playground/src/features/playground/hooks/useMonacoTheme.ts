// features/playground/hooks/useMonacoTheme.ts

"use client";

import { useEffect } from "react";
import type { Monaco } from "@monaco-editor/react";

/**
 * Syncs resolved theme → Monaco editor theme.
 * Relies on theme definitions already registered by `useMonacoLanguage`.
 */
export function useMonacoTheme(
  monaco: Monaco | null,
  resolvedTheme: string,
): void {
  useEffect(() => {
    if (!monaco) return;
    monaco.editor.setTheme(
      resolvedTheme === "dark" ? "verdant-dark" : "verdant-light",
    );
  }, [monaco, resolvedTheme]);
}