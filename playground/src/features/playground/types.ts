import type { VrdParseResult } from "@verdant/parser";
import type { CameraData, CursorData } from "@verdant/renderer";

export interface InspectorTarget {
  nodeId: string;
  screenX: number;
  screenY: number;
}

export interface AiHistoryEntry {
  id: string;
  prompt: string;
  codeBefore: string;
  codeAfter: string;
  nodesBefore: number;
  edgesBefore: number;
  nodesAfter: number;
  edgesAfter: number;
  timestamp: number;
}

export type SchemaTab = "code" | "ai";
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface PlaygroundState {
  // Code
  code: string;
  setCode: (code: string) => void;
  parseResult: VrdParseResult;
  nodeCount: number;
  edgeCount: number;
  errorCount: number;
  warningCount: number;

  // UI
  schemaOpen: boolean;
  setSchemaOpen: (open: boolean) => void;
  schemaTab: SchemaTab;
  setSchemaTab: (tab: SchemaTab) => void;
  activePreset: string;
  selectPreset: (key: string) => void;
  isRendererReady: boolean;
  showCoordinateSystem: boolean;
  setShowCoordinateSystem: (show: boolean) => void;
  toggleCoordinateSystem: () => void;

  // Camera
  cameraData: CameraData;
  setCameraData: (data: CameraData) => void;
  cursorData: CursorData | null;
  setCursorData: (data: CursorData | null) => void;

  // Inspector
  inspectorTarget: InspectorTarget | null;
  setInspectorTarget: (target: InspectorTarget | null) => void;

  // Theme
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
}