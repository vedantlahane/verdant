"use client";

import { useEffect } from "react";

/**
 * Syncs resolved theme → Monaco editor theme.
 */
export function useMonacoTheme(
  monaco: any,
  resolvedTheme: string,
): void {
  useEffect(() => {
    if (!monaco) return;
    monaco.editor.setTheme(
      resolvedTheme === "dark" ? "verdant-dark" : "verdant-light",
    );
  }, [monaco, resolvedTheme]);
}