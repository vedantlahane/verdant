// types.ts

/**
 * Reusable 3-component tuple for positions, targets, directions.
 * Eliminates hundreds of `[number, number, number]` annotations.
 */
export type Vec3 = readonly [number, number, number];

/**
 * Mutable variant for internal buffers where we write into tuples.
 */
export type MutVec3 = [number, number, number];

// ── Camera ──

export interface CameraData {
  /** World-space position */
  readonly position: Vec3;
  /** Lens field-of-view in degrees */
  readonly fov: number;
  /** Distance from camera to orbit target */
  readonly distance: number;
  /** Effective FOV accounting for zoom distance relative to baseline */
  readonly effectiveFov: number;
  /** Unit-axis projections into camera space (useful for HUD alignment) */
  readonly axisProjections: {
    readonly x: Vec3;
    readonly y: Vec3;
    readonly z: Vec3;
  };
}

// ── Cursor ──

export interface CursorData {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

// ── Persistence ──

export interface PersistedViewState {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly fov: number;
}

// ── Measurement ──

export interface MeasurementLine {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly fromId: string;
  readonly toId: string;
  readonly label?: string;
  readonly direction: 'outgoing' | 'incoming';
}

// ── Coordinate Grid ──

export interface TickData {
  readonly pos: Vec3;
  readonly axis: 'x' | 'y' | 'z';
  readonly val: number;
}

// ── Context Menu (discriminated union — impossible invalid states) ──

export type ContextMenuState =
  | Readonly<{
      visible: false;
      x: 0;
      y: 0;
      targetId?: undefined;
      targetType: 'canvas';
    }>
  | Readonly<{
      visible: true;
      x: number;
      y: number;
      targetId?: string;
      targetType: 'node' | 'edge' | 'group' | 'canvas';
    }>;

/** Default closed state — use instead of constructing ad-hoc objects. */
export const CONTEXT_MENU_CLOSED: ContextMenuState = Object.freeze({
  visible: false as const,
  x: 0 as const,
  y: 0 as const,
  targetType: 'canvas' as const,
});

// ── Node Click ──

export interface NodeClickInfo {
  readonly nodeId: string;
  readonly screenX: number;
  readonly screenY: number;
}

// ── Screen projection ──

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

// ── Public Props ──

export interface VerdantRendererProps {
  ast: import('@verdant/parser').VrdAST;
  theme?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  autoRotate?: boolean;
  showCoordinateSystem?: boolean;

  // Callbacks
  onNodeClick?: (info: NodeClickInfo) => void;
  onCameraChange?: (data: CameraData) => void;
  onCursorMove?: (data: CursorData | null) => void;

  // Controlled selection (ReadonlySet signals caller should not mutate)
  selectedNodeId?: string | null;
  onSelectionChange?: (ids: ReadonlySet<string>) => void;
  onUndoDepthChange?: (depth: number) => void;
}

// ── Internal Scene Props (decouples SceneContent from VerdantRenderer) ──

export interface SceneContentProps {
  autoRotate: boolean;
  showCoordinateSystem: boolean;
  onNodeClick?: VerdantRendererProps['onNodeClick'];
  onCursorMove?: (data: CursorData | null) => void;
  selectedNodeId?: string | null;
  initialTarget?: Vec3;
  onViewChange?: (view: PersistedViewState) => void;
}