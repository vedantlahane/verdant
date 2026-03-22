// primitives/src/provider/PrimitivesContext.ts

import { createContext, useContext } from 'react';
import type * as THREE from 'three';
import type { PrimitivesConfig } from './PrimitivesConfig';
import type { SharedGeometryPool } from '../geometry/SharedGeometryPool';
import type { MaterialCache } from '../materials/MaterialCache';
import type { NodeRegistry } from '../registry/NodeRegistry';
import type { ShapeRegistry } from '../registry/ShapeRegistry';
import type { PluginSystem } from '../registry/PluginSystem';
import type { CommandHistory } from '../interaction/CommandHistory';
import type { SelectionManager } from '../interaction/SelectionManager';
import type { DragManager } from '../interaction/DragManager';
import type { TransitionEngine } from '../animation/TransitionEngine';

export interface PrimitivesContextValue {
  // ── Resource pools ──
  geometryPool: SharedGeometryPool;
  materialCache: MaterialCache;
  statusMaterials: Record<string, THREE.MeshStandardMaterial>;

  // ── Registries ──
  nodeRegistry: NodeRegistry;
  shapeRegistry: ShapeRegistry;
  pluginSystem: PluginSystem;

  // ── Interaction subsystems ──
  commandHistory: CommandHistory;
  selectionManager: SelectionManager;
  dragManager: DragManager;
  transitionEngine: TransitionEngine;

  // ── Config ──
  config: PrimitivesConfig;
}

export const PrimitivesContext = createContext<PrimitivesContextValue | null>(null);

/**
 * Returns the nearest `PrimitivesProvider` context value.
 * **Throws** if called outside a `<PrimitivesProvider>`.
 */
export function usePrimitives(): PrimitivesContextValue {
  const ctx = useContext(PrimitivesContext);
  if (ctx === null) {
    throw new Error(
      '[usePrimitives] Must be called inside a <PrimitivesProvider>. ' +
      'Wrap your scene root with <PrimitivesProvider> to use v2 features.',
    );
  }
  return ctx;
}

/**
 * Returns the nearest `PrimitivesProvider` context value, or `null` if none exists.
 * Use this in components that work **with or without** the provider (backward compat).
 */
export function usePrimitivesOptional(): PrimitivesContextValue | null {
  return useContext(PrimitivesContext);
}