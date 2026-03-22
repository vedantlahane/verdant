// hooks/usePrimitivesSync.ts

import { useEffect } from 'react';
import * as THREE from 'three';
import { usePrimitives } from '@verdant/primitives';
import { useRendererStore } from '../store';
import { INSTANCING_THRESHOLD } from '../constants';

/**
 * Synchronizes the @verdant/primitives subsystems with the
 * renderer store:
 *
 * 1. SelectionManager → store.selectionSet
 * 2. TransitionEngine → enter animations for new nodes
 * 3. TransitionEngine → layout transition animations
 * 4. Instancing detection (logs qualifying shape groups)
 */
export function usePrimitivesSync(): void {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);
  const setSelectionSet = useRendererStore((s) => s.setSelectionSet);
  const setUndoDepth = useRendererStore((s) => s.setUndoDepth);

  const { selectionManager, commandHistory, transitionEngine } =
    usePrimitives();

  // ── SelectionManager → store sync ──

  useEffect(() => {
    if (!selectionManager) return;
    return selectionManager.onChange((ids: ReadonlySet<string>) => {
      setSelectionSet(new Set(ids));
      if (commandHistory) {
        setUndoDepth(
          commandHistory.canUndo
            ? (commandHistory as any).pointer + 1
            : 0,
        );
      }
    });
  }, [selectionManager, commandHistory, setSelectionSet, setUndoDepth]);

  // ── Enter animations ──

  useEffect(() => {
    if (!transitionEngine || !ast) return;
    for (const node of ast.nodes) {
      const enterAnim = node.props.enterAnimation as string | undefined;
      if (enterAnim) {
        transitionEngine.playEnter(
          node.id,
          enterAnim as 'fade' | 'scale' | 'slide',
          node.props.animationDuration as number | undefined,
        );
      }
    }
  }, [transitionEngine, ast]);

  // ── Layout transition animation ──

  useEffect(() => {
    if (!transitionEngine || !ast) return;
    const posMap = new Map<string, THREE.Vector3>();
    for (const [id, pos] of Object.entries(positions)) {
      posMap.set(id, new THREE.Vector3(pos[0], pos[1], pos[2]));
    }
    if (posMap.size > 0) {
      transitionEngine.playLayoutTransition(posMap, 500);
    }
  }, [transitionEngine, positions, ast]);

  // ── Instancing detection ──

  useEffect(() => {
    if (!ast) return;
    const shapeCounts = new Map<string, number>();
    for (const node of ast.nodes) {
      const shape = (node.props.shape as string) || node.type;
      shapeCounts.set(shape, (shapeCounts.get(shape) ?? 0) + 1);
    }
    for (const [shape, count] of shapeCounts) {
      if (count >= INSTANCING_THRESHOLD) {
        // TODO: activate InstancedRenderer for shape group
        void shape;
        void count;
      }
    }
  }, [ast]);
}