// primitives/src/provider/PrimitivesProvider.tsx

import React, { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
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

interface PrimitivesProviderProps {
  config?: PrimitivesConfig;
  children: React.ReactNode;
}

/**
 * Root context provider for `@verdant/primitives` v2.
 *
 * Instantiates all subsystems on mount and disposes them on unmount.
 * All subsystem instances are stable across re-renders (created once).
 */
export function PrimitivesProvider({
  config = {},
  children,
}: PrimitivesProviderProps) {
  // ── Resource Pools (stable for lifetime of provider) ──

  const geometryPool = useMemo(() => new SharedGeometryPool(), []);
  const materialCache = useMemo(() => new MaterialCache(), []);

  // ── Registries (stable) ──

  const nodeRegistry = useMemo(() => new NodeRegistry(), []);
  const shapeRegistry = useMemo(() => new ShapeRegistry(), []);
  const pluginSystem = useMemo(
    () => new PluginSystem(nodeRegistry, shapeRegistry),
    [nodeRegistry, shapeRegistry],
  );

  // ── Interaction (stable) ──

  const maxUndo = config.maxUndoHistory ?? 100;
  const commandHistory = useMemo(
    () => new CommandHistory({ maxDepth: maxUndo }),
    // maxUndo captured at creation time; if it changes we'd need to recreate
    // but that's a rare config change, so we keep it stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const selectionManager = useMemo(() => new SelectionManager(), []);
  const transitionEngine = useMemo(() => new TransitionEngine(), []);

  // Shared node position map — DragManager reads/writes, renderer syncs
  const nodePositionsRef = useRef(new Map<string, Vector3>());

  const dragManager = useMemo(
    () => new DragManager(selectionManager, commandHistory, nodePositionsRef.current),
    [selectionManager, commandHistory],
  );

  // ── Status Materials ──

  const statusMaterials = useMemo(
    () => createStatusMaterials(config.statusColors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.statusColors],
  );

  // ── Plugin Installation (side effect, runs once) ──

  const installedPluginsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!config.plugins) return;
    for (const plugin of config.plugins) {
      if (installedPluginsRef.current.has(plugin.name)) continue;
      pluginSystem.install(plugin);
      installedPluginsRef.current.add(plugin.name);
    }
  }, [config.plugins, pluginSystem]);

  // ── Cleanup on unmount ──

  useEffect(() => {
    return () => {
      geometryPool.dispose();
      materialCache.dispose();

      for (const mat of Object.values(statusMaterials)) {
        if (mat && typeof mat.dispose === 'function') {
          mat.dispose();
        }
      }

      commandHistory.clear();
      selectionManager.clearSelection();
    };
  }, [geometryPool, materialCache, statusMaterials, commandHistory, selectionManager]);

  // ── Context value (stable reference when deps don't change) ──

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
      config,
    }),
    [
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
      config,
    ],
  );

  return (
    <PrimitivesContext.Provider value={value}>
      {children}
    </PrimitivesContext.Provider>
  );
}