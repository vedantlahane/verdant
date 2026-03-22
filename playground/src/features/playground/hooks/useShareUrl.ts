// features/playground/hooks/useShareUrl.ts

"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/** Safe URL length limit — most browsers support ~2000 chars in URL bar,
 *  but hash can be longer. 8000 is conservative for share links. */
const MAX_HASH_LENGTH = 8000;

interface UseShareUrlReturn {
  readonly shareCurrentCode: (code: string) => Promise<void>;
}

/**
 * Handles share URL encoding/decoding via URL hash (base64).
 *
 * On mount, checks `window.location.hash` for a shared diagram
 * and loads it into the editor. Provides `shareCurrentCode` to
 * encode the current diagram into a copyable URL.
 *
 * @param setCode - Setter to load decoded code into editor
 * @param setActivePreset - Setter to clear preset indicator on URL load
 */
export function useShareUrl(
  setCode: (code: string) => void,
  setActivePreset: (preset: string) => void,
): UseShareUrlReturn {
  const initializedRef = useRef(false);

  // ── Load code from hash on mount ──
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (typeof window === "undefined") return;

    const hash = window.location.hash.slice(1);
    if (!hash) return;

    try {
      const decoded = decodeURIComponent(escape(atob(hash)));
      if (decoded.trim()) {
        setCode(decoded);
        setActivePreset("");
      }
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Verdant] Invalid share link — ignoring hash");
      }
    }
  }, [setCode, setActivePreset]);

  // ── Create share link ──
  const shareCurrentCode = useCallback(
    async (code: string): Promise<void> => {
      try {
        const encoded = btoa(unescape(encodeURIComponent(code)));

        if (encoded.length > MAX_HASH_LENGTH) {
          toast.error("Diagram too large for share URL");
          return;
        }

        const url = new URL(window.location.href);
        url.hash = encoded;
        window.history.replaceState(null, "", url.toString());

        // Clipboard API requires secure context — fall back gracefully
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url.toString());
          toast.success("Share link copied");
        } else {
          // Fallback: select + copy
          const textArea = document.createElement("textarea");
          textArea.value = url.toString();
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          toast.success("Share link copied");
        }
      } catch {
        toast.error("Could not create share link");
      }
    },
    [],
  );

  return { shareCurrentCode };
}