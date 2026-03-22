// primitives/src/index.ts
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

export type {
  PrimitivesConfig,
  MinimapConfig,
  PostProcessingConfig,
} from './provider/PrimitivesConfig';

export type { ShapeDefinition } from './shapes/ShapeDefinition';

// ── Provider ────────────────────────────────────────────────

export { PrimitivesProvider } from './provider/PrimitivesProvider';
export { usePrimitives, usePrimitivesOptional } from './provider/PrimitivesContext';

// ── Core Components ─────────────────────────────────────────

export { BaseNode } from './nodes/BaseNode';
export { BaseEdge } from './edges/BaseEdge';

// ── Shapes ──────────────────────────────────────────────────

export * as Shapes from './shapes';

// ── Node Subsystems ─────────────────────────────────────────

export { NodeBadge } from './nodes/NodeBadge';
export { NodePorts } from './nodes/NodePorts';

// ── Edge Subsystems ─────────────────────────────────────────

export { EdgeRouter } from './edges/EdgeRouter';
export { FlowParticles } from './edges/FlowParticles';
export { resolvePort, resolveEdgeEndpoints } from './edges/EdgePorts';

// ── Groups ──────────────────────────────────────────────────

export { GroupContainer } from './groups/GroupContainer';
export { GroupCollapse } from './groups/GroupCollapse';
export { NestedGroup } from './groups/NestedGroup';

// ── Layout ──────────────────────────────────────────────────

export { HierarchicalLayout } from './layout/HierarchicalLayout';

// ── Animation ───────────────────────────────────────────────

export { TransitionEngine } from './animation/TransitionEngine';
export { EnterExit } from './animation/EnterExit';

// ── Interaction ─────────────────────────────────────────────

export { SelectionManager } from './interaction/SelectionManager';
export { CommandHistory } from './interaction/CommandHistory';
export { DragManager } from './interaction/DragManager';
export { CameraControls } from './interaction/CameraControls';
export { KeyboardNav } from './interaction/KeyboardNav';
export { ContextMenu } from './interaction/ContextMenu';

// ── Minimap ─────────────────────────────────────────────────

export { Minimap } from './minimap/Minimap';

// ── Performance ─────────────────────────────────────────────

export { SharedGeometryPool } from './geometry/SharedGeometryPool';
export { GeometryFactory } from './geometry/GeometryFactory';
export { MaterialCache } from './materials/MaterialCache';
export { StatusMaterials } from './materials/StatusMaterials';
export { ObjectPool } from './performance/ObjectPool';
export { InstancedRenderer } from './performance/InstancedRenderer';
export { FrustumCulling } from './performance/FrustumCulling';
export { LODController } from './performance/LODController';

// ── Post-processing ─────────────────────────────────────────

export { PostProcessingPipeline } from './postprocessing/PostProcessingPipeline';

// ── Data Binding ────────────────────────────────────────────

export { DataBinding } from './databinding/DataBinding';

// ── Export Utilities ────────────────────────────────────────

export { GLTFExport } from './export/GLTFExport';
export { PNGExport } from './export/PNGExport';
export { SVGExport } from './export/SVGExport';

// ── Registry ────────────────────────────────────────────────

export { NodeRegistry } from './registry/NodeRegistry';
export { ShapeRegistry } from './registry/ShapeRegistry';
export { PluginSystem } from './registry/PluginSystem';