"use client";

import { useEffect, useRef, useState } from "react";
import { parseVrdSafe, VrdParseResult } from "@verdant/parser";

const EMPTY_RESULT: VrdParseResult = {
  ast: { config: {}, nodes: [], edges: [], groups: [] },
  diagnostics: [],
};

/**
 * Debounced parsing — avoids re-parsing on every keystroke.
 * Returns latest parse result, updating after `delay` ms of inactivity.
 * First parse is immediate (no delay).
 */
export function useDebouncedParse(
  code: string,
  delay: number = 150,
): VrdParseResult {
  const [result, setResult] = useState<VrdParseResult>(() =>
    code.trim() ? parseVrdSafe(code) : EMPTY_RESULT,
  );
  const isFirstRender = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // First render: parse immediately
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (code.trim()) {
        setResult(parseVrdSafe(code));
      }
      return;
    }

    // Subsequent changes: debounce
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setResult(code.trim() ? parseVrdSafe(code) : EMPTY_RESULT);
      timerRef.current = null;
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [code, delay]);

  return result;
}