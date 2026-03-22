// features/playground/hooks/useKeyboardShortcuts.ts

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { InspectorTarget, SchemaTab } from "../types";

// ── Pure helper (module-level, not inside component) ──

const isMonacoFocused = (e: KeyboardEvent): boolean =>
  !!(e.target as HTMLElement)?.closest?.(".monaco-editor");

const isTextInput = (e: KeyboardEvent): boolean => {
  const t = e.target;
  return (
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    (t instanceof HTMLElement && t.isContentEditable)
  );
};

// ── Options interface ──

interface UseKeyboardShortcutsOptions {
  readonly inspectorTarget: InspectorTarget | null;
  readonly setInspectorTarget: (target: InspectorTarget | null) => void;
  readonly schemaOpen: boolean;
  readonly setSchemaOpen: (open: boolean) => void;
  readonly setSchemaTab: (tab: SchemaTab) => void;
  readonly exportPng: () => void;
  readonly toggleCoordinateSystem: () => void;
  readonly shortcutHelpOpen: boolean;
  readonly setShortcutHelpOpen: (open: boolean) => void;
}

/**
 * Global keyboard shortcut handler for the playground.
 *
 * Uses refs for volatile state (inspector, panel open, help open)
 * so the keydown listener is registered exactly once and never
 * torn down / re-attached on state changes.
 *
 * Escape priority chain:
 *   1. Close shortcut help overlay
 *   2. Close inspector
 *   3. Close schema panel
 */
export function useKeyboardShortcuts({
  inspectorTarget,
  setInspectorTarget,
  schemaOpen,
  setSchemaOpen,
  setSchemaTab,
  exportPng,
  toggleCoordinateSystem,
  shortcutHelpOpen,
  setShortcutHelpOpen,
}: UseKeyboardShortcutsOptions): void {
  // ── Volatile state refs (update every render, no effect re-run) ──
  const inspectorRef = useRef(inspectorTarget);
  const schemaOpenRef = useRef(schemaOpen);
  const helpOpenRef = useRef(shortcutHelpOpen);

  inspectorRef.current = inspectorTarget;
  schemaOpenRef.current = schemaOpen;
  helpOpenRef.current = shortcutHelpOpen;

  // ── Stable action refs (functions from Zustand / useState are already stable,
  //    but wrapping in refs guarantees zero dep-array churn) ──
  const actionsRef = useRef({
    setInspectorTarget,
    setSchemaOpen,
    setSchemaTab,
    exportPng,
    toggleCoordinateSystem,
    setShortcutHelpOpen,
  });
  actionsRef.current = {
    setInspectorTarget,
    setSchemaOpen,
    setSchemaTab,
    exportPng,
    toggleCoordinateSystem,
    setShortcutHelpOpen,
  };

  // ── Handler created once ──
  const handler = useCallback((e: KeyboardEvent): void => {
    const mod = e.metaKey || e.ctrlKey;
    const actions = actionsRef.current;

    // ── Escape: priority chain (fires even in Monaco) ──
    if (e.key === "Escape") {
      // 1. Shortcut help overlay
      if (helpOpenRef.current) {
        e.preventDefault();
        actions.setShortcutHelpOpen(false);
        return;
      }
      // 2. Inspector
      if (inspectorRef.current) {
        e.preventDefault();
        actions.setInspectorTarget(null);
        return;
      }
      // 3. Schema panel
      if (schemaOpenRef.current) {
        e.preventDefault();
        actions.setSchemaOpen(false);
        return;
      }
      return;
    }

    // ── All remaining shortcuts guarded against Monaco focus ──
    if (isMonacoFocused(e)) return;

    // ?: toggle keyboard shortcut help overlay
    if (e.key === "?" && !mod) {
      e.preventDefault();
      actions.setShortcutHelpOpen(!helpOpenRef.current);
      return;
    }

    // ⌘B: toggle schema panel
    if (mod && e.key === "b") {
      e.preventDefault();
      actions.setSchemaOpen(!schemaOpenRef.current);
      return;
    }

    // ⌘K: open AI tab
    if (mod && e.key === "k") {
      e.preventDefault();
      actions.setSchemaOpen(true);
      actions.setSchemaTab("ai");
      return;
    }

    // ⌘⇧E: export PNG
    if (mod && e.shiftKey && e.key === "E") {
      e.preventDefault();
      actions.exportPng();
      return;
    }

    // Guard remaining shortcuts against text inputs
    if (isTextInput(e)) return;

    // G: toggle coordinate system
    if (e.key === "g" && !mod && !e.shiftKey) {
      e.preventDefault();
      actions.toggleCoordinateSystem();
      return;
    }

    // F: fullscreen
    if (e.key === "f" && !mod && !e.shiftKey) {
      e.preventDefault();
      document.documentElement.requestFullscreen?.()?.catch(() => {});
      return;
    }
  }, []); // empty deps — reads everything from refs

  // ── Single registration, never re-attached ──
  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}