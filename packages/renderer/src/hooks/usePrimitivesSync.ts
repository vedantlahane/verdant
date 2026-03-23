// hooks/usePrimitivesSync.ts

import { useEffect, useRef } from 'react';                            // ← CHANGED: added useRef
import * as THREE from 'three';
import { usePrimitives } from '@verdant/primitives';
import { useRendererStore } from '../store';
import { INSTANCING_THRESHOLD } from '../constants';

export function usePrimitivesSync(): void {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);
  const draggingNodeId = useRendererStore((s) => s.draggingNodeId);    // ← NEW (Bug #1)
  const setSelectionSet = useRendererStore((s) => s.setSelectionSet);
  const setUndoDepth = useRendererStore((s) => s.setUndoDepth);
  const setCanRedo = useRendererStore((s) => s.setCanRedo);

  const { selectionManager, commandHistory, transitionEngine } =
    usePrimitives();

  // Track previous positions ref to detect actual layout changes       ← NEW
  const prevPositionsRef = useRef(positions);

  // ── History → store sync ──
  useEffect(() => {
    if (!commandHistory) return;
    return commandHistory.subscribe((state) => {
      setUndoDepth(state.canUndo ? state.pointer + 1 : 0);
      setCanRedo(state.canRedo);
    });
  }, [commandHistory, setUndoDepth, setCanRedo]);

  // ── SelectionManager → store sync ──
  useEffect(() => {
    if (!selectionManager) return;
    return selectionManager.onChange((ids: ReadonlySet<string>) => {
      setSelectionSet(new Set(ids));
    });
  }, [selectionManager, setSelectionSet]);

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
  // Bug #1 fix: Skip during drag. The old code had `positions` as a     ← CHANGED
  // dependency, which meant every drag frame (60/sec) created N
  // Vector3 objects and fired playLayoutTransition. Now we:
  // 1. Skip entirely when a drag is in progress
  // 2. Only fire when positions actually change (not just reference)
  useEffect(() => {
    if (!transitionEngine || !ast) return;

    // Bug #1: Skip layout transitions while dragging                   ← NEW
    if (draggingNodeId != null) {
      prevPositionsRef.current = positions;
      return;
    }

    // Skip if positions reference hasn't changed (no actual layout)
    if (positions === prevPositionsRef.current) return;
    prevPositionsRef.current = positions;

    const posMap = new Map<string, THREE.Vector3>();
    for (const [id, pos] of Object.entries(positions)) {
      posMap.set(id, new THREE.Vector3(pos[0], pos[1], pos[2]));
    }
    if (posMap.size > 0) {
      transitionEngine.playLayoutTransition(posMap, 500);
    }
  }, [transitionEngine, positions, ast, draggingNodeId]);              // ← CHANGED: added draggingNodeId

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