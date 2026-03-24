// hooks/useKeyboardNavigation.ts

import { useEffect, useCallback, useRef } from 'react';              // ← CHANGED: added useRef
import { useThree } from '@react-three/fiber';
import { usePrimitives } from '@verdant/primitives';
import { useRendererStore } from '../store';
import { zoomToFit } from '../utils';

function isEditorFocused(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  return !!(
    target.closest('.monaco-editor') ||
    target.closest('[data-keybinding-context]') ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}

export function useKeyboardNavigation(
  controlsRef: React.RefObject<any>,
): void {
  const { camera } = useThree();                                      // ← CHANGED: removed gl (unused)
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);
  const { selectionManager, commandHistory } = usePrimitives();
  const setUndoDepth = useRendererStore((s) => s.setUndoDepth);

  // Bug #14 fix: store focusedIdx in a ref so it persists across       ← CHANGED
  // effect re-runs (e.g., when commandHistory changes from undo/redo)
  const focusedIdxRef = useRef(-1);

  const handleZoomToFit = useCallback(() => {                          // ← CHANGED: uses shared zoomToFit
    zoomToFit(positions, camera, controlsRef.current);
  }, [positions, camera, controlsRef]);

  const syncUndoDepth = useCallback(() => {
    if (!commandHistory) return;
    setUndoDepth(
      commandHistory.canUndo ? (commandHistory as any).pointer + 1 : 0,
    );
  }, [commandHistory, setUndoDepth]);

  useEffect(() => {
    if (!ast) return;

    const nodeIds = ast.nodes.map((n) => n.id);

    const handler = (e: KeyboardEvent) => {
      if (isEditorFocused(e)) return;

      const mod = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case 'Tab': {
          e.preventDefault();
          if (nodeIds.length === 0) break;
          focusedIdxRef.current = e.shiftKey                           // ← CHANGED: ref
            ? (focusedIdxRef.current - 1 + nodeIds.length) % nodeIds.length
            : (focusedIdxRef.current + 1) % nodeIds.length;
          selectionManager?.select(nodeIds[focusedIdxRef.current]);
          break;
        }

        case 'Enter':
        case ' ': {
          const idx = focusedIdxRef.current;                           // ← CHANGED: ref
          if (idx >= 0 && idx < nodeIds.length) {
            selectionManager?.select(nodeIds[idx]);
          }
          break;
        }

        case 'f':
        case 'F': {
          if (!mod) handleZoomToFit();                                 // ← CHANGED: shared impl
          break;
        }

        case 'z': {
          if (!mod) break;
          e.preventDefault();
          if (e.shiftKey) {
            commandHistory?.redo();
          } else {
            commandHistory?.undo();
          }
          syncUndoDepth();
          break;
        }

        case 'y': {
          if (!mod) break;
          e.preventDefault();
          commandHistory?.redo();
          syncUndoDepth();
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [ast, selectionManager, commandHistory, handleZoomToFit, syncUndoDepth]);
}