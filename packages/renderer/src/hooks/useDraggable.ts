// hooks/useDraggable.ts

import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
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
//
//  All drag state is stored in refs to avoid re-renders during
//  the high-frequency pointer move events. The component tree
//  never needs to know whether we're "mid-drag" — only the
//  final position matters (written to the store).
// ═══════════════════════════════════════════════════════════════════

interface DragState {
  /** Whether a drag is currently in progress */
  active: boolean;
  /** Pointer ID for capture management */
  pointerId: number;
  /** Plane onto which pointer is projected (perpendicular to camera) */
  plane: THREE.Plane;
  /** Offset from pointer hit to node center at drag start */
  offset: THREE.Vector3;
  /** Reusable raycaster for pointer projection */
  raycaster: THREE.Raycaster;
  /** Reusable intersection point vector */
  intersection: THREE.Vector3;
  /** Reusable NDC vector for pointer conversion */
  ndc: THREE.Vector2;
  /** Reusable camera direction vector */
  camDir: THREE.Vector3;
  /** Reusable world position vector */
  worldPos: THREE.Vector3;
}

function createDragState(): DragState {
  return {
    active: false,
    pointerId: -1,
    plane: new THREE.Plane(),
    offset: new THREE.Vector3(),
    raycaster: new THREE.Raycaster(),
    intersection: new THREE.Vector3(),
    ndc: new THREE.Vector2(),
    camDir: new THREE.Vector3(),
    worldPos: new THREE.Vector3(),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Convert a DOM PointerEvent to NDC (normalized device coordinates).
 * Writes into a reusable Vector2 to avoid allocation.
 */
function pointerToNDC(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  out: THREE.Vector2,
): THREE.Vector2 {
  out.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  out.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  return out;
}

/**
 * Raycast from NDC onto a plane, writing the intersection into `out`.
 * Returns false if the ray is parallel to the plane (no intersection).
 */
function raycastToPlane(
  ndc: THREE.Vector2,
  camera: THREE.Camera,
  plane: THREE.Plane,
  raycaster: THREE.Raycaster,
  out: THREE.Vector3,
): boolean {
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(plane, out) !== null;
}

// ═══════════════════════════════════════════════════════════════════
//  Hook
// ═══════════════════════════════════════════════════════════════════

/**
 * Provides pointer event handlers for dragging a 3D node on a
 * camera-facing plane.
 *
 * Architecture:
 * - On pointer down: establish a drag plane perpendicular to the
 *   camera at the node's current depth, compute pointer offset.
 * - On pointer move: project pointer onto the drag plane, subtract
 *   offset, write new position to both the ref (for immediate
 *   visual feedback) and the store (for persistence/sync).
 * - On pointer up: release capture, notify drag end.
 *
 * All intermediate Three.js objects (raycaster, vectors, plane) are
 * allocated once in a ref and reused across drag events — zero
 * allocation during the drag loop.
 */
export function useDraggable({
  nodeId,
  positionRef,
  onDragStart,
  onDragEnd,
}: UseDraggableOptions): DraggableHandlers {
  const { camera, gl } = useThree();
  const updateNodePosition = useRendererStore((s) => s.updateNodePosition);
  const setDraggingNode = useRendererStore((s) => s.setDraggingNode);

  const dragRef = useRef<DragState | null>(null);

  // Lazy-init drag state on first use
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

      // Set up drag plane perpendicular to camera through node position
      camera.getWorldDirection(state.camDir);
      state.worldPos.set(pos[0], pos[1], pos[2]);
      state.plane.setFromNormalAndCoplanarPoint(state.camDir, state.worldPos);

      // Raycast pointer onto drag plane to compute offset
      pointerToNDC(e.clientX, e.clientY, rect, state.ndc);
      if (!raycastToPlane(state.ndc, camera, state.plane, state.raycaster, state.intersection)) {
        return; // Ray parallel to plane — abort
      }

      state.offset.copy(state.intersection).sub(state.worldPos);
      state.active = true;
      state.pointerId = e.pointerId;

      setDraggingNode(nodeId);
      onDragStart();
      canvas.style.cursor = 'grabbing';

      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture may fail if element is detached
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

      const newPos: MutVec3 = [
        state.intersection.x - state.offset.x,
        state.intersection.y - state.offset.y,
        state.intersection.z - state.offset.z,
      ];

      // Reject NaN/Infinity positions (can occur with degenerate projections)
      if (!isFiniteVec3(newPos)) return;

      positionRef.current = newPos;
      updateNodePosition(nodeId, newPos);
    },
    [camera, gl, nodeId, positionRef, updateNodePosition],
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
        // Pointer capture may already be released
      }
    },
    [gl, onDragEnd, setDraggingNode],
  );

  // ── Safety: cancel drag if component unmounts mid-drag ──
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

  return { onPointerDown, onPointerMove, onPointerUp };
}