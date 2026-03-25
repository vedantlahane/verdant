// grid/RaycastFloor.tsx

import React, { useMemo } from 'react';
import { PlaneGeometry } from 'three';

/**
 * Invisible infinite-ish ground plane for raycasting.
 *
 * Used by double-click-to-pivot and cursor tracking to find
 * a world-space point under the pointer even when no node is hit.
 *
 * Geometry is created once (useMemo) and shared across renders.
 * Not attached to the scene graph visually (visible=false).
 */

const FLOOR_SIZE = 10_000;
const FLOOR_Y = -0.004;
const FLOOR_ROTATION: readonly [number, number, number] = [-Math.PI / 2, 0, 0];

const _geometry = new PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);

export const RaycastFloor = React.memo(function RaycastFloor() {
  return (
    <mesh
      position-y={FLOOR_Y}
      rotation={FLOOR_ROTATION}
      visible={false}
      geometry={_geometry}
    />
  );
});