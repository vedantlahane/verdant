"use client";

import { useEffect, useCallback } from "react";
import type { InspectorTarget, SchemaTab } from "../types";

interface ShortcutHandlers {
  inspectorTarget: InspectorTarget | null;
  setInspectorTarget: (target: InspectorTarget | null) => void;
  schemaOpen: boolean;
  setSchemaOpen: (open: boolean) => void;
  setSchemaTab: (tab: SchemaTab) => void;
  exportPng: () => void;
  toggleCoordinateSystem: () => void;
}

export function useKeyboardShortcuts({
  inspectorTarget,
  setInspectorTarget,
  schemaOpen,
  setSchemaOpen,
  setSchemaTab,
  exportPng,
  toggleCoordinateSystem,
}: ShortcutHandlers): void {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Escape: close inspector → close whatever is open
      if (e.key === "Escape") {
        if (inspectorTarget) {
          setInspectorTarget(null);
          return;
        }
      }

      // ⌘B: toggle schema panel
      if (mod && e.key === "b") {
        e.preventDefault();
        setSchemaOpen(!schemaOpen);
        return;
      }

      // ⌘K: open AI tab
      if (mod && e.key === "k") {
        e.preventDefault();
        setSchemaOpen(true);
        setSchemaTab("ai");
        return;
      }

      // ⌘⇧E: export PNG
      if (mod && e.shiftKey && e.key === "E") {
        e.preventDefault();
        exportPng();
        return;
      }

      // G: toggle coordinate system (only when not typing)
      if (
        e.key === "g" &&
        !mod &&
        !e.shiftKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.closest?.(".monaco-editor")
      ) {
        e.preventDefault();
        toggleCoordinateSystem();
        return;
      }

      // F: fullscreen (only when not typing)
      if (
        e.key === "f" &&
        !mod &&
        !e.shiftKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.closest?.(".monaco-editor")
      ) {
        e.preventDefault();
        document.documentElement.requestFullscreen?.()?.catch(() => {});
        return;
      }
    },
    [
      inspectorTarget,
      setInspectorTarget,
      schemaOpen,
      setSchemaOpen,
      setSchemaTab,
      exportPng,
      toggleCoordinateSystem,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}