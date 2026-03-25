// hooks/useCursorTracking.ts

import { useEffect, useMemo, useRef } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import type { CursorData } from '../types';

export function useCursorTracking(
  controlsRef: React.RefObject<any>,
  onCursorMove?: (data: CursorData | null) => void,
): void {
  const { camera, gl } = useThree();

  const raycaster = useMemo(() => new Raycaster(), []);
  const plane = useRef(new Plane());
  const normal = useRef(new Vector3());
  const hitPoint = useMemo(() => new Vector3(), []);
  const ndc = useMemo(() => new Vector2(), []);                 // ← NEW: pooled (Bug #11)

  useFrame(() => {
    if (!controlsRef.current || !onCursorMove) return;

    camera.getWorldDirection(normal.current);
    const target = controlsRef.current.target as Vector3;
    plane.current.setFromNormalAndCoplanarPoint(normal.current, target);
  });

  useEffect(() => {
    if (!onCursorMove) return;

    const canvas = gl.domElement;

    const handleMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      // Bug #11 fix: reuse pooled Vector2 instead of allocating       ← CHANGED
      ndc.set(
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
  }, [camera, gl, hitPoint, ndc, onCursorMove, raycaster]);            // ← CHANGED: added ndc
}