// features/playground/hooks/useOutsideClick.ts

"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Fires `onOutsideClick` when a mousedown event occurs outside `ref`.
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
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent): void => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) {
        onOutsideClick();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutsideClick, enabled]);
}