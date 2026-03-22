// features/playground/hooks/useOutsideClick.ts

"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Fires `onOutsideClick` when a mousedown event occurs outside `ref`.
 *
 * Uses a ref for the callback to avoid re-registering the listener
 * every time the callback identity changes (common with inline arrows).
 *
 * @param ref - Element to treat as "inside"
 * @param onOutsideClick - Callback when click lands outside
 * @param enabled - Gate to skip listener registration (default: true)
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutsideClick: () => void,
  enabled: boolean = true,
): void {
  const callbackRef = useRef(onOutsideClick);
  callbackRef.current = onOutsideClick;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent): void => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) {
        callbackRef.current();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, enabled]);
}