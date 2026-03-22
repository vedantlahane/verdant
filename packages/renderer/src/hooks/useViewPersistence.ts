// hooks/useViewPersistence.ts

import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { PersistedViewState } from '../types';
import { VIEW_PERSIST_THROTTLE_MS } from '../constants';

/**
 * Throttled camera view persistence.
 *
 * Returns a stable callback suitable for OrbitControls `onChange`.
 * Writes are throttled to avoid excessive localStorage writes
 * during smooth camera movements.
 */
export function useViewPersistence(
  controlsRef: React.RefObject<any>,
  onViewChange?: (view: PersistedViewState) => void,
): (() => void) | undefined {
  const lastPersistTime = useRef(0);

  const handleChange = useCallback(() => {
    if (!onViewChange || !controlsRef.current) return;

    const now = performance.now();
    if (now - lastPersistTime.current < VIEW_PERSIST_THROTTLE_MS) return;
    lastPersistTime.current = now;

    const cam = controlsRef.current.object as THREE.PerspectiveCamera;
    const target = controlsRef.current.target as THREE.Vector3;

    onViewChange({
      position: [cam.position.x, cam.position.y, cam.position.z],
      target: [target.x, target.y, target.z],
      fov: cam.fov,
    });
  }, [controlsRef, onViewChange]);

  // Return undefined when no persistence is needed — OrbitControls
  // accepts undefined for onChange and skips the callback entirely
  return onViewChange ? handleChange : undefined;
}