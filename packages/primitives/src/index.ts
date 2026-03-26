// ============================================================
// @verdant/primitives v2 — public API
// ============================================================

// ── Types ───────────────────────────────────────────────────

export type {
  NodeProps,
  EdgeLineProps,
  NodeStatus,
  AnimationType,
  EdgeStyle,
  RoutingAlgorithm,
  BadgePosition,
  SizeKey,
  FlowParticleConfig,
  NodePort,
  DataBindingConfig,
} from './types';
export type { NodeBadge as NodeBadgeType } from './types';
export { SIZE_SCALE } from './types';

// ── Provider ────────────────────────────────────────────────

export {
  PrimitivesProvider,
  usePrimitives,
  usePrimitivesOptional,
} from './provider';
export type {
  PrimitivesConfig,
  MinimapConfig,
  PostProcessingConfig,
} from './provider';

// ── Shapes ──────────────────────────────────────────────────

export type { ShapeDefinition } from './shapes';
export * as Shapes from './shapes';

// ── Core Components ─────────────────────────────────────────

export { BaseNode } from './nodes';
export { BaseEdge } from './edges';

// ── Node Subsystems ─────────────────────────────────────────

export { NodeBadge } from './nodes';
export { NodePorts } from './nodes';

// ── Edge Subsystems ─────────────────────────────────────────

export { EdgeRouter } from './edges';
export { FlowParticles } from './edges';
export { resolvePort, resolveEdgeEndpoints } from './edges';
export { samplePathAtT } from './edges';

// ── Groups ──────────────────────────────────────────────────

export { GroupContainer, GroupCollapse, NestedGroup } from './groups';

// ── Layout ──────────────────────────────────────────────────

export { HierarchicalLayout } from './layout';

// ── Animation ───────────────────────────────────────────────

export { TransitionEngine } from './animation';
export { EnterExit } from './animation';

// ── Interaction ─────────────────────────────────────────────

export {
  SelectionManager,
  CommandHistory,
  DragManager,
  CameraControls,
  KeyboardNav,
  ContextMenu,
} from './interaction';

// ── Minimap ─────────────────────────────────────────────────

export { Minimap } from './minimap';

// ── Performance ─────────────────────────────────────────────

export {
  ObjectPool,
  InstancedRenderer,
  FrustumCulling,
  LODController,
} from './performance';

// ── Geometry & Materials ────────────────────────────────────

export { SharedGeometryPool, GeometryFactory } from './geometry';
export { MaterialCache, StatusMaterials } from './materials';

// ── Post-processing ─────────────────────────────────────────

export { PostProcessingPipeline } from './postprocessing';

// ── Data Binding ────────────────────────────────────────────

export { DataBinding } from './databinding';

// ── Export Utilities ────────────────────────────────────────

export { GLTFExport, PNGExport, SVGExport } from './export';

// ── Registry ────────────────────────────────────────────────

export { NodeRegistry, ShapeRegistry, PluginSystem } from './registry';