"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useThemeMode } from "@/features/shared/hooks/useThemeMode";
import type { CameraData, CursorData } from "@verdant/renderer";
import { PRESETS } from "../constants/presets";
import { useDebouncedParse } from "./useDebouncedParse";
import type { InspectorTarget, PlaygroundState } from "../types";

export function usePlaygroundState(): PlaygroundState {
  // ── Code ──
  const [code, setCode] = useState(PRESETS.simple.code);
  const parseResult = useDebouncedParse(code);

  const nodeCount = parseResult.ast.nodes.length;
  const edgeCount = parseResult.ast.edges.length;

  const errorCount = useMemo(
    () => parseResult.diagnostics.filter((d) => d.severity === "error").length,
    [parseResult.diagnostics],
  );

  const warningCount = useMemo(
    () => parseResult.diagnostics.filter((d) => d.severity === "warning").length,
    [parseResult.diagnostics],
  );

  // ── UI ──
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [schemaTab, setSchemaTab] = useState<"code" | "ai">("code");
  const [activePreset, setActivePreset] = useState<string>("simple");
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

  // ── Camera ──
  const [cameraData, setCameraData] = useState<CameraData>({
    position: [0, 6, 12],
    fov: 45,
    distance: 14.0,
    effectiveFov: 45,
    axisProjections: {
      x: [1, 0, 0],
      y: [0, 0.89, 0.45],
      z: [0, -0.45, 0.89],
    },
  });
  const [cursorData, setCursorData] = useState<CursorData | null>(null);

  // ── Inspector ──
  const [inspectorTarget, setInspectorTarget] = useState<InspectorTarget | null>(null);

  // ── Theme ──
  const { resolvedTheme, themeMode, setThemeMode } = useThemeMode("dark");

  const toggleTheme = useCallback(() => {
    if (themeMode === "system") {
      setThemeMode(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      setThemeMode(themeMode === "dark" ? "light" : "dark");
    }
  }, [themeMode, resolvedTheme, setThemeMode]);

  // ── Init renderer delay ──
  useEffect(() => {
    const t = setTimeout(() => setIsRendererReady(true), 600);
    return () => clearTimeout(t);
  }, []);

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

    resolvedTheme: (resolvedTheme as "light" | "dark") ?? "dark",
    toggleTheme,
  };
}