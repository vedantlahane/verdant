// hooks/useKeyboardNavigation.ts

import { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { usePrimitives } from '@verdant/primitives';
import { useRendererStore } from '../store';

/**
 * Check if a keyboard event originates from an element that handles
 * its own keyboard input (Monaco editor, input fields, etc.)
 */
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

/**
 * Keyboard navigation for the 3D scene.
 *
 * Supports:
 * - Tab / Shift+Tab: cycle through nodes
 * - Enter / Space: confirm selection
 * - F: zoom to fit all nodes
 * - Ctrl+Z / Cmd+Z: undo
 * - Ctrl+Y / Cmd+Shift+Z: redo
 *
 * All shortcuts are suppressed when an editor or input has focus.
 */
export function useKeyboardNavigation(
  controlsRef: React.RefObject<any>,
): void {
  const { gl } = useThree();
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);
  const { selectionManager, commandHistory } = usePrimitives();
  const setUndoDepth = useRendererStore((s) => s.setUndoDepth);

  // ── Zoom to fit ──

  const zoomToFit = useCallback(() => {
    if (!controlsRef.current || !ast) return;
    const posValues = Object.values(positions);
    if (posValues.length === 0) return;

    const box = new THREE.Box3();
    for (const pos of posValues) {
      box.expandByPoint(new THREE.Vector3(pos[0], pos[1], pos[2]));
    }
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const cam = controlsRef.current.object as THREE.PerspectiveCamera;
    const fovRad = (cam.fov * Math.PI) / 180;
    const dist = (sphere.radius / Math.sin(fovRad / 2)) * 1.2;

    const dir = cam.position.clone().sub(sphere.center).normalize();
    cam.position.copy(sphere.center).addScaledVector(dir, dist);
    controlsRef.current.target.copy(sphere.center);
    controlsRef.current.update();
  }, [ast, controlsRef, positions]);

  // ── Undo depth sync ──

  const syncUndoDepth = useCallback(() => {
    if (!commandHistory) return;
    setUndoDepth(
      commandHistory.canUndo ? (commandHistory as any).pointer + 1 : 0,
    );
  }, [commandHistory, setUndoDepth]);

  // ── Keyboard handler ──

  useEffect(() => {
    if (!ast) return;

    const nodeIds = ast.nodes.map((n) => n.id);
    let focusedIdx = -1;

    const handler = (e: KeyboardEvent) => {
      if (isEditorFocused(e)) return;

      const mod = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case 'Tab': {
          e.preventDefault();
          if (nodeIds.length === 0) break;
          focusedIdx = e.shiftKey
            ? (focusedIdx - 1 + nodeIds.length) % nodeIds.length
            : (focusedIdx + 1) % nodeIds.length;
          selectionManager?.select(nodeIds[focusedIdx]);
          break;
        }

        case 'Enter':
        case ' ': {
          if (focusedIdx >= 0 && focusedIdx < nodeIds.length) {
            selectionManager?.select(nodeIds[focusedIdx]);
          }
          break;
        }

        case 'f':
        case 'F': {
          if (!mod) zoomToFit();
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

    // Attach to both window (for undo/redo) and canvas (for navigation)
    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [ast, selectionManager, commandHistory, zoomToFit, syncUndoDepth]);
}