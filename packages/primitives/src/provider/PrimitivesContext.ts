import { createContext, useContext } from 'react';
import type { SharedGeometryPool } from '../geometry/SharedGeometryPool';
import type { MaterialCache } from '../materials/MaterialCache';
import type { NodeStatus } from '../materials/StatusMaterials';
import type * as THREE from 'three';
import type { PrimitivesConfig } from './PrimitivesConfig';
import type { NodeRegistry } from '../registry/NodeRegistry';
import type { ShapeRegistry } from '../registry/ShapeRegistry';
import type { PluginSystem } from '../registry/PluginSystem';
import type { CommandHistory } from '../interaction/CommandHistory';
import type { SelectionManager } from '../interaction/SelectionManager';
import type { DragManager } from '../interaction/DragManager';
import type { TransitionEngine } from '../animation/TransitionEngine';

export type { NodeRegistry, ShapeRegistry, PluginSystem };
export type { CommandHistory, SelectionManager, DragManager, TransitionEngine };

export type InstancedRenderer = null;
export type DataBinding = null;

export interface PrimitivesContextValue {
  geometryPool: SharedGeometryPool;
  materialCache: MaterialCache;
  statusMaterials: Record<NodeStatus, THREE.MeshStandardMaterial>;
  nodeRegistry: NodeRegistry;
  shapeRegistry: ShapeRegistry;
  pluginSystem: PluginSystem;
  commandHistory: CommandHistory | null;
  selectionManager: SelectionManager | null;
  dragManager: DragManager | null;
  transitionEngine: TransitionEngine | null;
  instancedRenderer: null; // still null until Task 15 wiring
  dataBinding: null;
  config: PrimitivesConfig;
}

export const PrimitivesContext = createContext<PrimitivesContextValue | null>(null);

/**
 * Returns the nearest PrimitivesProvider context value.
 * Throws a descriptive error if called outside of a PrimitivesProvider.
 */
export function usePrimitives(): PrimitivesContextValue {
  const ctx = useContext(PrimitivesContext);
  if (ctx === null) {
    throw new Error(
      'usePrimitives() must be called inside a <PrimitivesProvider>. ' +
        'Wrap your diagram root with <PrimitivesProvider> to use this hook.'
    );
  }
  return ctx;
}
