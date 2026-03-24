// index.ts

// ═══════════════════════════════════════════════════════════════════
//  Components
// ═══════════════════════════════════════════════════════════════════

export { VerdantRenderer, astConfigToPrimitivesConfig } from './VerdantRenderer';

// ═══════════════════════════════════════════════════════════════════
//  Store
// ═══════════════════════════════════════════════════════════════════

export { useRendererStore, cancelPendingPersist, flushPendingPersist } from './store';
export type { RendererState } from './store';

// ═══════════════════════════════════════════════════════════════════
//  Layout
// ═══════════════════════════════════════════════════════════════════

export { computeLayout, computePositionsForNewNodes } from './layout';
export type { LayoutType, LayoutDirection } from './layout';

// ═══════════════════════════════════════════════════════════════════
//  Scene Utilities
// ═══════════════════════════════════════════════════════════════════

export { zoomToFit } from './SceneContent';

// ═══════════════════════════════════════════════════════════════════
//  Node Registry
// ═══════════════════════════════════════════════════════════════════

export {
  getNodeComponent,
  isKnownNodeType,
  getRegisteredNodeTypes,
  FALLBACK_NODE,
} from './nodes/nodeMap';

// ═══════════════════════════════════════════════════════════════════
//  Measurement
// ═══════════════════════════════════════════════════════════════════

export { MeasurementLinesGroup } from './measurement/MeasurementLinesGroup';

// ═══════════════════════════════════════════════════════════════════
//  Persistence
// ═══════════════════════════════════════════════════════════════════

export {
  clearAllPersistedState,
  clearPersistedStateForAst,
} from './store.persistence';

// ═══════════════════════════════════════════════════════════════════
//  Utilities
// ═══════════════════════════════════════════════════════════════════

export {
  projectToScreen,
  detectDarkMode,
  VEC3_ORIGIN,
  setsEqual,
  computeSceneBounds,
} from './utils';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

export {
  MIN_NODE_DISTANCE,
  AXIS_COLOR_X,
  AXIS_COLOR_Y,
  AXIS_COLOR_Z,
  AXIS_EXTENT_PADDING,
  MIN_AXIS_EXTENT,
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_TARGET,
  ORBIT_MIN_DISTANCE,
  ORBIT_MAX_DISTANCE,
  INSTANCING_THRESHOLD,
} from './constants';

/** @deprecated Use dynamic axis extent computed from scene bounds. */
export { GRID_SIZE, AXIS_LENGTH } from './constants';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export type {
  Vec3,
  MutVec3,
  AxisId,
  VerdantRendererProps,
  SceneContentProps,
  CameraData,
  CursorData,
  VerdantRendererHandle,
  MeasurementLine,
  SceneBounds,
  PersistedViewState,
  NodeClickInfo,
  ScreenPoint,
  ContextMenuState,
} from './types';

export { CONTEXT_MENU_CLOSED } from './types';

export type { PersistedRendererState } from './store.persistence';

/** @deprecated TickData is removed in the grid redesign. */
export type { TickData } from './types';

// ═══════════════════════════════════════════════════════════════════
//  Renderer / WebGPU
// ═══════════════════════════════════════════════════════════════════

export type { RendererBackend } from './renderer/detectWebGPU';
export { isWebGPUAvailable, isWebGPUAvailableSync, detectBestBackend } from './renderer/detectWebGPU';

export type { RendererConfig, RendererResult } from './renderer/createRenderer';
export { createWebGLRenderer, createWebGPURenderer, createOptimalRenderer } from './renderer/createRenderer';

export type { UseRendererOptions, UseRendererResult } from './renderer/useRenderer';
export { useRenderer } from './renderer/useRenderer';