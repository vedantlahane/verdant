// hooks/useCursorTracking.ts

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import type { CursorData } from '../types';

/**
 * Tracks pointer position projected onto a camera-facing plane
 * through the orbit target.
 *
 * The plane is updated every frame to stay perpendicular to the
 * camera direction, so cursor coordinates are always in the
 * "natural" viewing plane.
 *
 * Uses native DOM events (not R3F's event system) for lower
 * overhead — cursor tracking doesn't need hit-testing against
 * scene objects.
 */
export function useCursorTracking(
  controlsRef: React.RefObject<any>,
  onCursorMove?: (data: CursorData | null) => void,
): void {
  const { camera, gl } = useThree();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useRef(new THREE.Plane());
  const normal = useRef(new THREE.Vector3());
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

  // Keep the cursor plane perpendicular to camera through orbit target
  useFrame(() => {
    if (!controlsRef.current || !onCursorMove) return;

    camera.getWorldDirection(normal.current);
    const target = controlsRef.current.target as THREE.Vector3;
    plane.current.setFromNormalAndCoplanarPoint(normal.current, target);
  });

  // Pointer event listeners on the canvas
  useEffect(() => {
    if (!onCursorMove) return;

    const canvas = gl.domElement;

    const handleMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(plane.current, hitPoint);
      if (!hit) {
        onCursorMove(null);
        return;
      }

      onCursorMove({
        x: Math.round(hitPoint.x * 10) / 10,
        y: Math.round(hitPoint.y * 10) / 10,
        z: Math.round(hitPoint.z * 10) / 10,
      });
    };

    const handleLeave = () => onCursorMove(null);

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerleave', handleLeave);

    return () => {
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerleave', handleLeave);
    };
  }, [camera, gl, hitPoint, onCursorMove, raycaster]);
}