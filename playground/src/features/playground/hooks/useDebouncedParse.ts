// features/playground/hooks/useDebouncedParse.ts

"use client";

import { useEffect, useRef, useState } from "react";
import { parseVrdSafe } from "@verdant/parser";
import type { VrdParseResult } from "@verdant/parser";

// ── Frozen empty singleton (pattern 3: referential stability) ──

const EMPTY_AST = Object.freeze({
  config: Object.freeze({}),
  nodes: Object.freeze([]),
  edges: Object.freeze([]),
  groups: Object.freeze([]),
});

const EMPTY_DIAGNOSTICS = Object.freeze([]);

const EMPTY_RESULT: VrdParseResult = Object.freeze({
  ast: EMPTY_AST,
  diagnostics: EMPTY_DIAGNOSTICS,
}) as VrdParseResult;

/** Default debounce delay in milliseconds */
const DEFAULT_DELAY_MS = 150;

/**
 * Debounced .vrd parsing — avoids re-parsing on every keystroke.
 *
 * Returns the latest parse result, updating after `delay` ms of
 * typing inactivity. The very first parse is synchronous (no delay)
 * so the UI has content on mount.
 *
 * @param code - Raw .vrd source text
 * @param delay - Debounce window in ms (default: 150)
 */
export function useDebouncedParse(
  code: string,
  delay: number = DEFAULT_DELAY_MS,
): VrdParseResult {
  // Initial state: parse synchronously if there's content,
  // otherwise use the frozen empty singleton.
  const [result, setResult] = useState<VrdParseResult>(() =>
    code.trim() ? parseVrdSafe(code) : EMPTY_RESULT,
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // First render: state was already initialized in useState —
    // skip the redundant parse.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any pending debounce timer
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Schedule parse after debounce window
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setResult(code.trim() ? parseVrdSafe(code) : EMPTY_RESULT);
    }, delay);

    // Cleanup on unmount or before next effect
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [code, delay]);

  return result;
}