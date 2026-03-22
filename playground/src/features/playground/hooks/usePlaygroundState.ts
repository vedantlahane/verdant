// features/playground/hooks/usePlaygroundState.ts

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThemeMode } from "@/features/shared/hooks/useThemeMode";
import { useRendererStore } from "@verdant/renderer";
import type { CameraData, CursorData } from "@verdant/renderer";

import { PRESETS, DEFAULT_PRESET_KEY } from "../constants/presets";
import { useDebouncedParse } from "./useDebouncedParse";
import { DEFAULT_CAMERA_DATA } from "../types";
import type { InspectorTarget, PlaygroundState, SchemaTab } from "../types";

/** FPS display update interval in milliseconds */
const FPS_UPDATE_INTERVAL_MS = 1000;

/** Renderer ready delay in milliseconds — lets first frame render */
const RENDERER_READY_DELAY_MS = 600;

/**
 * Central state composer for the playground.
 *
 * Owns all local UI state, delegates parsing to `useDebouncedParse`,
 * and pulls renderer metrics from the Zustand store.
 *
 * Returns a stable `PlaygroundState` — action functions are referentially
 * stable across renders (from `useCallback` / `useState` setters).
 */
export function usePlaygroundState(): PlaygroundState {
  // ── Code ──────────────────────────────────────
  const [code, setCode] = useState(() => PRESETS[DEFAULT_PRESET_KEY].code);
  const parseResult = useDebouncedParse(code);

  const nodeCount = parseResult.ast.nodes.length;
  const edgeCount = parseResult.ast.edges.length;

  // Single-pass diagnostic counting
  const { errorCount, warningCount } = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    for (const d of parseResult.diagnostics) {
      if (d.severity === "error") errors++;
      else if (d.severity === "warning") warnings++;
    }
    return { errorCount: errors, warningCount: warnings };
  }, [parseResult.diagnostics]);

  // ── UI ────────────────────────────────────────
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [schemaTab, setSchemaTab] = useState<SchemaTab>("code");
  const [activePreset, setActivePreset] = useState<string>(DEFAULT_PRESET_KEY);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [showCoordinateSystem, setShowCoordinateSystem] = useState(true);

  const toggleCoordinateSystem = useCallback(
    () => setShowCoordinateSystem((v) => !v),
    [],
  );

  const selectPreset = useCallback((key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    setCode(preset.code);
    setActivePreset(key);
    setSchemaTab("code");
  }, []);

  // ── Camera ────────────────────────────────────
  const [cameraData, setCameraData] = useState<CameraData>(DEFAULT_CAMERA_DATA);
  const [cursorData, setCursorData] = useState<CursorData | null>(null);

  // ── Inspector ─────────────────────────────────
  const [inspectorTarget, setInspectorTarget] = useState<InspectorTarget | null>(null);

  // ── Status bar (from renderer Zustand store) ──
  const selectionSet = useRendererStore((s) => s.selectionSet);
  const undoDepth = useRendererStore((s) => s.undoDepth);
  const layoutName = useRendererStore((s) => s.layoutName);
  const rawFps = useRendererStore((s) => s.fps);

  // FPS throttle — reads latest value from ref on a fixed interval.
  // Avoids the lossy useEffect + Date.now() check pattern.
  const [fps, setFps] = useState(0);
  const rawFpsRef = useRef(rawFps);
  rawFpsRef.current = rawFps;

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(rawFpsRef.current);
    }, FPS_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const selectionCount = selectionSet.size;

  // ── Theme ─────────────────────────────────────
  const { resolvedTheme, themeMode, setThemeMode } = useThemeMode("dark");

  const toggleTheme = useCallback(() => {
    const current = themeMode === "system" ? resolvedTheme : themeMode;
    setThemeMode(current === "dark" ? "light" : "dark");
  }, [themeMode, resolvedTheme, setThemeMode]);

  // ── Renderer ready delay ──────────────────────
  useEffect(() => {
    const t = setTimeout(() => setIsRendererReady(true), RENDERER_READY_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // ── Return ────────────────────────────────────
  return {
    code,
    setCode,
    parseResult,
    nodeCount,
    edgeCount,
    errorCount,
    warningCount,

    schemaOpen,
    setSchemaOpen,
    schemaTab,
    setSchemaTab,
    activePreset,
    selectPreset,
    isRendererReady,
    showCoordinateSystem,
    setShowCoordinateSystem,
    toggleCoordinateSystem,

    cameraData,
    setCameraData,
    cursorData,
    setCursorData,

    inspectorTarget,
    setInspectorTarget,

    selectionCount,
    undoDepth,
    layoutName,
    fps,

    resolvedTheme: resolvedTheme === "light" ? "light" : "dark",
    toggleTheme,
  };
}