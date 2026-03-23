// grid/AxisGizmo.tsx

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AXIS_COLOR_X,
  AXIS_COLOR_Y,
  AXIS_COLOR_Z,
  AXIS_GIZMO_SCREEN_SIZE,
} from '../constants';
import type { Vec3 } from '../types';

// ═══════════════════════════════════════════════════════════════════
//  Materials (module-level singletons)
// ═══════════════════════════════════════════════════════════════════

const MAT_X = new THREE.MeshBasicMaterial({ color: AXIS_COLOR_X });
const MAT_Y = new THREE.MeshBasicMaterial({ color: AXIS_COLOR_Y });
const MAT_Z = new THREE.MeshBasicMaterial({ color: AXIS_COLOR_Z });

const SHAFT_GEO = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);
const TIP_GEO = new THREE.ConeGeometry(0.06, 0.15, 6);

// Rotations to orient shafts along each axis
const ROT_X: [number, number, number] = [0, 0, -Math.PI / 2];
const ROT_Z: [number, number, number] = [Math.PI / 2, 0, 0];

// Tip offsets (end of unit shaft)
const TIP_OFFSET_X: [number, number, number] = [0.575, 0, 0];
const TIP_OFFSET_Y: [number, number, number] = [0, 0.575, 0];
const TIP_OFFSET_Z: [number, number, number] = [0, 0, 0.575];
const TIP_ROT_X: [number, number, number] = [0, 0, -Math.PI / 2];
const TIP_ROT_Z: [number, number, number] = [Math.PI / 2, 0, 0];

// ═══════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════

export interface AxisGizmoProps {
  /** World-space position to render the gizmo at (e.g., orbit target) */
  readonly target?: Vec3;
}

/**
 * Small XYZ axis indicator that maintains consistent screen-space size
 * regardless of camera distance.
 *
 * Renders at the orbit target (or origin) to show axis orientation
 * relative to the current camera angle.
 */
export const AxisGizmo = React.memo(function AxisGizmo({
  target,
}: AxisGizmoProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const { camera } = useThree();

  const position = useMemo<[number, number, number]>(
    () => target ? [target[0], target[1], target[2]] : [0, 0, 0],
    [target],
  );

  // Scale inversely with distance so gizmo stays constant screen size
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const dist = camera.position.distanceTo(group.position);
    // Approximate: at distance 16 (default), scale=1
    // AXIS_GIZMO_SCREEN_SIZE controls apparent pixel size
    const scale = (dist / 16) * (AXIS_GIZMO_SCREEN_SIZE / 40);
    group.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* X shaft */}
      <mesh geometry={SHAFT_GEO} material={MAT_X} rotation={ROT_X} position={[0.5, 0, 0]} />
      <mesh geometry={TIP_GEO} material={MAT_X} rotation={TIP_ROT_X} position={TIP_OFFSET_X} />

      {/* Y shaft */}
      <mesh geometry={SHAFT_GEO} material={MAT_Y} position={[0, 0.5, 0]} />
      <mesh geometry={TIP_GEO} material={MAT_Y} position={TIP_OFFSET_Y} />

      {/* Z shaft */}
      <mesh geometry={SHAFT_GEO} material={MAT_Z} rotation={ROT_Z} position={[0, 0, 0.5]} />
      <mesh geometry={TIP_GEO} material={MAT_Z} rotation={TIP_ROT_Z} position={TIP_OFFSET_Z} />
    </group>
  );
});