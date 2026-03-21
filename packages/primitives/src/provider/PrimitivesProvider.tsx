import React, { useEffect, useMemo } from 'react';
import { SharedGeometryPool } from '../geometry/SharedGeometryPool';
import { MaterialCache } from '../materials/MaterialCache';
import { createStatusMaterials } from '../materials/StatusMaterials';
import { NodeRegistry } from '../registry/NodeRegistry';
import { ShapeRegistry } from '../registry/ShapeRegistry';
import { PluginSystem } from '../registry/PluginSystem';
import { CommandHistory } from '../interaction/CommandHistory';
import { SelectionManager } from '../interaction/SelectionManager';
import { DragManager } from '../interaction/DragManager';
import { TransitionEngine } from '../animation/TransitionEngine';
import { PrimitivesContext } from './PrimitivesContext';
import type { PrimitivesConfig } from './PrimitivesConfig';
import type { PrimitivesContextValue } from './PrimitivesContext';
import * as THREE from 'three';

interface PrimitivesProviderProps {
  config?: PrimitivesConfig;
  children: React.ReactNode;
}

/**
 * Root context provider for @verdant/primitives v2.
 *
 * Instantiates all subsystems and makes them available via usePrimitives().
 * All subsystems are disposed when the provider unmounts.
 */
export function PrimitivesProvider({ config = {}, children }: PrimitivesProviderProps) {
  const geometryPool = useMemo(() => new SharedGeometryPool(), []);
  const materialCache = useMemo(() => new MaterialCache(), []);
  const nodeRegistry = useMemo(() => new NodeRegistry(), []);
  const shapeRegistry = useMemo(() => new ShapeRegistry(), []);
  const pluginSystem = useMemo(
    () => new PluginSystem(nodeRegistry, shapeRegistry),
    [nodeRegistry, shapeRegistry]
  );

  const commandHistory = useMemo(() => new CommandHistory({ maxDepth: config.maxUndoHistory ?? 100 }), []);
  const selectionManager = useMemo(() => new SelectionManager(), []);
  const transitionEngine = useMemo(() => new TransitionEngine(), []);
  const dragManager = useMemo(
    () => new DragManager(selectionManager, commandHistory, new Map<string, THREE.Vector3>()),
    [selectionManager, commandHistory]
  );

  const statusMaterials = useMemo(
    () => createStatusMaterials(config.statusColors),
    // Re-create only when the statusColors reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.statusColors]
  );

  // Install plugins from config (run once per pluginSystem instance)
  useMemo(() => {
    if (config.plugins) {
      for (const plugin of config.plugins) {
        pluginSystem.install(plugin);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginSystem]);

  // Dispose all subsystems on unmount
  useEffect(() => {
    return () => {
      geometryPool.dispose();
      materialCache.dispose();
      for (const mat of Object.values(statusMaterials)) {
        mat.dispose();
      }
    };
  }, [geometryPool, materialCache, statusMaterials]);

  const value: PrimitivesContextValue = useMemo(
    () => ({
      geometryPool,
      materialCache,
      statusMaterials,
      nodeRegistry,
      shapeRegistry,
      pluginSystem,
      commandHistory,
      selectionManager,
      dragManager,
      transitionEngine,
      instancedRenderer: null,
      dataBinding: null,
      config,
    }),
    [geometryPool, materialCache, statusMaterials, nodeRegistry, shapeRegistry, pluginSystem,
     commandHistory, selectionManager, dragManager, transitionEngine, config]
  );

  return (
    <PrimitivesContext.Provider value={value}>
      {children}
    </PrimitivesContext.Provider>
  );
}
