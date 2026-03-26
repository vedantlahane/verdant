// hooks/useDraggable.ts

import { useRef, useCallback, useEffect } from 'react';
import { Camera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { usePrimitivesOptional } from '@verdant/primitives';
import { useRendererStore } from '../store';
import type { Vec3, MutVec3 } from '../types';
import { isFiniteVec3 } from '../utils';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface DraggableHandlers {
  readonly onPointerDown: (e: any) => void;
  readonly onPointerMove: (e: any) => void;
  readonly onPointerUp: (e: any) => void;
  /** Ref — read `.current` inside event handlers to avoid stale closure */
  readonly hasMovedRef: React.RefObject<boolean>;
}

export interface UseDraggableOptions {
  /** Node ID being dragged */
  readonly nodeId: string;

  /**
   * Mutable ref to the node's current position.
   * Updated in-place during drag for immediate visual feedback
   * without waiting for store propagation.
   */
  readonly positionRef: React.MutableRefObject<MutVec3>;

  /** Called when drag begins — typically disables OrbitControls */
  readonly onDragStart: () => void;

  /** Called when drag ends — typically re-enables OrbitControls */
  readonly onDragEnd: () => void;
}

// ═══════════════════════════════════════════════════════════════════
//  Internal State
// ═══════════════════════════════════════════════════════════════════

interface DragState {
  active: boolean;
  pointerId: number;
  hasMoved: boolean;
  startPos: Vector3;
  plane: Plane;
  offset: Vector3;
  raycaster: Raycaster;
  intersection: Vector3;
  ndc: Vector2;
  camDir: Vector3;
  worldPos: Vector3;
}

function createDragState(): DragState {
  return {
    active: false,
    pointerId: -1,
    hasMoved: false,
    startPos: new Vector3(),
    plane: new Plane(),
    offset: new Vector3(),
    raycaster: new Raycaster(),
    intersection: new Vector3(),
    ndc: new Vector2(),
    camDir: new Vector3(),
    worldPos: new Vector3(),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

function pointerToNDC(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  out: Vector2,
): Vector2 {
  out.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  out.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  return out;
}

function raycastToPlane(
  ndc: Vector2,
  camera: Camera,
  plane: Plane,
  raycaster: Raycaster,
  out: Vector3,
): boolean {
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(plane, out) !== null;
}

// ═══════════════════════════════════════════════════════════════════
//  Hook
// ═══════════════════════════════════════════════════════════════════

export function useDraggable({
  nodeId,
  positionRef,
  onDragStart,
  onDragEnd,
}: UseDraggableOptions): DraggableHandlers {
  const { camera, gl } = useThree();
  const updateNodePosition = useRendererStore((s) => s.updateNodePosition);
  const setDraggingNode = useRendererStore((s) => s.setDraggingNode);

  const primitivesCtx = usePrimitivesOptional();
  const snapConfig = primitivesCtx?.config?.snap;

  const dragRef = useRef<DragState | null>(null);

  function getDragState(): DragState {
    if (!dragRef.current) {
      dragRef.current = createDragState();
    }
    return dragRef.current;
  }

  const onPointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();

      const state = getDragState();
      const pos = positionRef.current;
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();

      camera.getWorldDirection(state.camDir);
      state.worldPos.set(pos[0], pos[1], pos[2]);
      state.plane.setFromNormalAndCoplanarPoint(state.camDir, state.worldPos);

      pointerToNDC(e.clientX, e.clientY, rect, state.ndc);
      if (!raycastToPlane(state.ndc, camera, state.plane, state.raycaster, state.intersection)) {
        return;
      }

      state.offset.copy(state.intersection).sub(state.worldPos);
      state.active = true;
      state.hasMoved = false;
      state.pointerId = e.pointerId;
      state.startPos.copy(state.worldPos);

      setDraggingNode(nodeId);
      onDragStart();
      canvas.style.cursor = 'grabbing';

      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    },
    [camera, gl, nodeId, positionRef, onDragStart, setDraggingNode],
  );

  const onPointerMove = useCallback(
    (e: any) => {
      const state = dragRef.current;
      if (!state?.active) return;

      e.stopPropagation();

      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      pointerToNDC(e.clientX, e.clientY, rect, state.ndc);
      if (!raycastToPlane(state.ndc, camera, state.plane, state.raycaster, state.intersection)) {
        return;
      }

      let finalX = state.intersection.x - state.offset.x;
      let finalY = state.intersection.y - state.offset.y;
      let finalZ = state.intersection.z - state.offset.z;

      if (snapConfig?.enabled) {
        const gs = snapConfig.gridSize || 1.0;
        finalX = Math.round(finalX / gs) * gs;
        finalY = Math.round(finalY / gs) * gs;
        finalZ = Math.round(finalZ / gs) * gs;
      }

      const newPos: MutVec3 = [finalX, finalY, finalZ];

      if (!isFiniteVec3(newPos)) return;

      if (!state.hasMoved) {
        state.worldPos.set(newPos[0], newPos[1], newPos[2]);
        if (state.worldPos.distanceTo(state.startPos) > 0.05) {
          state.hasMoved = true;
        }
      }

      positionRef.current = newPos;
      updateNodePosition(nodeId, newPos);
    },
    [camera, gl, nodeId, positionRef, updateNodePosition, snapConfig],
  );

  const onPointerUp = useCallback(
    (e: any) => {
      const state = dragRef.current;
      if (!state?.active) return;

      state.active = false;
      state.pointerId = -1;

      setDraggingNode(null);
      onDragEnd();
      gl.domElement.style.cursor = '';

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    },
    [gl, onDragEnd, setDraggingNode],
  );

  useEffect(() => {
    return () => {
      const state = dragRef.current;
      if (state?.active) {
        state.active = false;
        setDraggingNode(null);
        gl.domElement.style.cursor = '';
      }
    };
  }, [gl, setDraggingNode]);

  const hasMovedRef = useRef(false);

  if (dragRef.current) {
    hasMovedRef.current = dragRef.current.hasMoved;
  }

  return { onPointerDown, onPointerMove, onPointerUp, hasMovedRef };
}