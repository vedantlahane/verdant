// index.ts
//
// Public API surface of @verdant/renderer.
//
// Design principles:
// - Export only what consumers need — internal hooks, sub-components,
//   and utilities are implementation details
// - Re-export types with `export type` for isolatedModules compatibility
// - Group exports by domain with comments for navigability
// - Avoid barrel re-exports of entire modules (tree-shaking hostile)

// ═══════════════════════════════════════════════════════════════════
//  Components
// ═══════════════════════════════════════════════════════════════════

export { VerdantRenderer, astConfigToPrimitivesConfig } from './VerdantRenderer';

// ═══════════════════════════════════════════════════════════════════
//  Store
// ═══════════════════════════════════════════════════════════════════

export { useRendererStore } from './store';
export type { RendererState } from './store';

// ═══════════════════════════════════════════════════════════════════
//  Layout
// ═══════════════════════════════════════════════════════════════════

export { computeLayout, computePositionsForNewNodes } from './layout';
export type { LayoutType, LayoutDirection } from './layout';

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

export { projectToScreen, detectDarkMode, VEC3_ORIGIN } from './utils';

// ═══════════════════════════════════════════════════════════════════
//  Constants
//
//  Exported for consumers who need to align with renderer defaults
//  (e.g., editor showing grid size, external camera controllers
//  matching orbit limits).
// ═══════════════════════════════════════════════════════════════════

export {
  // Layout
  MIN_NODE_DISTANCE,

  // Grid
  GRID_SIZE,
  AXIS_LENGTH,

  // Camera
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_TARGET,
  ORBIT_MIN_DISTANCE,
  ORBIT_MAX_DISTANCE,

  // Rendering
  INSTANCING_THRESHOLD,
} from './constants';

// ═══════════════════════════════════════════════════════════════════
//  Types
//
//  All public types in one section for easy discovery.
//  Using `export type` ensures these are erased at compile time
//  and don't affect bundle size.
// ═══════════════════════════════════════════════════════════════════

export type {
  // Core data
  Vec3,
  MutVec3,

  // Props
  VerdantRendererProps,
  SceneContentProps,

  // Camera
  CameraData,
  CursorData,

  // Scene elements
  MeasurementLine,
  TickData,

  // Persistence
  PersistedViewState,

  // Interaction
  NodeClickInfo,
  ScreenPoint,
  ContextMenuState,
} from './types';

export { CONTEXT_MENU_CLOSED } from './types';

export type { DraggableHandlers, UseDraggableOptions } from './hooks/useDraggable';
export type { PersistedRendererState } from './store.persistence';
export type { GridGeometries } from './grid/createGridGeometries';
export type { GridMaterials } from './grid/createGridMaterials';