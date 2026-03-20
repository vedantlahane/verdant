"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

const MAX_HASH_LENGTH = 8000; // Safe URL length limit

/**
 * Handles share URL encoding/decoding and initial load from hash.
 */
export function useShareUrl(
  setCode: (code: string) => void,
  setActivePreset: (preset: string) => void,
) {
  const initializedRef = useRef(false);

  // ── Load code from hash on mount ──
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (typeof window === "undefined" || !window.location.hash) return;

    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      const decoded = decodeURIComponent(escape(atob(hash)));
      if (decoded.trim()) {
        setCode(decoded);
        setActivePreset("");
      }
    } catch {
      console.warn("[Verdant] Invalid share link — ignoring hash");
    }
  }, [setCode, setActivePreset]);

  // ── Create share link ──
  const shareCurrentCode = useCallback(
    async (code: string) => {
      try {
        const encoded = btoa(unescape(encodeURIComponent(code)));

        if (encoded.length > MAX_HASH_LENGTH) {
          toast.error("Diagram too large for share URL");
          return;
        }

        const url = new URL(window.location.href);
        url.hash = encoded;
        window.history.replaceState(null, "", url.toString());
        await navigator.clipboard.writeText(url.toString());
        toast.success("Share link copied");
      } catch {
        toast.error("Could not create share link");
      }
    },
    [],
  );

  return { shareCurrentCode };
}