// features/playground/types.ts

import type { VrdParseResult } from "@verdant/parser";
import type { CameraData, CursorData, LayoutType, VerdantRendererHandle } from "@verdant/renderer";

// ── Re-exports for playground consumers ──
export type { CameraData, CursorData, LayoutType, VerdantRendererHandle };


// ── Scalar unions ──

export type SchemaTab = "code" | "ai";
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type ExportFormat = "png" | "svg" | "gltf";

// ── Inspector ──

export interface InspectorTarget {
  readonly nodeId: string;
  readonly screenX: number;
  readonly screenY: number;
}

// ── AI History ──

export interface AiHistoryEntry {
  readonly id: string;
  readonly prompt: string;
  readonly codeBefore: string;
  readonly codeAfter: string;
  readonly nodesBefore: number;
  readonly edgesBefore: number;
  readonly nodesAfter: number;
  readonly edgesAfter: number;
  readonly timestamp: number;
}

// ── Preset ──

export interface Preset {
  readonly label: string;
  readonly description: string;
  readonly code: string;
}

// ── Default camera data (frozen singleton for initial state) ──

export const DEFAULT_CAMERA_DATA: CameraData = Object.freeze({
  position: Object.freeze([0, 6, 12]) as readonly [number, number, number],
  fov: 45,
  distance: 14.0,
  effectiveFov: 45,
  axisProjections: Object.freeze({
    x: Object.freeze([1, 0, 0]) as readonly [number, number, number],
    y: Object.freeze([0, 0.89, 0.45]) as readonly [number, number, number],
    z: Object.freeze([0, -0.45, 0.89]) as readonly [number, number, number],
  }),
});

// ── Playground state (readonly contract for consumers) ──

/**
 * Read-only state slice — consumed via context selectors.
 * All fields are readonly to prevent accidental mutation.
 */
export interface PlaygroundStateData {
  // Code
  readonly code: string;
  readonly parseResult: VrdParseResult;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly errorCount: number;
  readonly warningCount: number;

  // UI
  readonly schemaOpen: boolean;
  readonly schemaTab: SchemaTab;
  readonly activePreset: string;
  readonly isRendererReady: boolean;
  readonly showCoordinateSystem: boolean;

  // Camera
  readonly cameraData: CameraData;
  readonly cursorData: CursorData | null;

  // Inspector
  readonly inspectorTarget: InspectorTarget | null;

  // Status bar
  readonly selectionCount: number;
  readonly undoDepth: number;
  readonly layoutName: LayoutType;
  readonly fps: number;

  // Theme
  readonly resolvedTheme: ResolvedTheme;

  // Feature Flags (derived or local)
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly minimapEnabled: boolean;
  readonly postProcessingEnabled: boolean;
  readonly gridSnapEnabled: boolean;
}


/**
 * Action dispatchers — stable function references from hooks.
 * Separated from data to enable fine-grained memoization.
 */
export interface PlaygroundActions {
  readonly setCode: (code: string) => void;
  readonly setSchemaOpen: (open: boolean) => void;
  readonly setSchemaTab: (tab: SchemaTab) => void;
  readonly selectPreset: (key: string) => void;
  readonly setShowCoordinateSystem: (show: boolean) => void;
  readonly toggleCoordinateSystem: () => void;
  readonly setCameraData: (data: CameraData) => void;
  readonly setCursorData: (data: CursorData | null) => void;
  readonly setInspectorTarget: (target: InspectorTarget | null) => void;
  readonly toggleTheme: () => void;

  // Renderer control
  readonly undo: () => void;
  readonly redo: () => void;
  readonly zoomToFit: () => void;
  readonly resetCamera: () => void;

  // Config toggles
  readonly toggleMinimap: () => void;
  readonly togglePostProcessing: () => void;
  readonly toggleGridSnap: () => void;
}


/**
 * Combined state + actions — the full playground context shape.
 * Prefer using `PlaygroundStateData` or `PlaygroundActions`
 * individually when only one side is needed.
 */
export interface PlaygroundState extends PlaygroundStateData, PlaygroundActions {}