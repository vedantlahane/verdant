// grid/AxisLines.tsx

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useRendererStore } from '../store';
import { computeSceneBounds } from '../utils';
import type { SceneBounds } from '../types';
import {
  AXIS_COLOR_X,
  AXIS_COLOR_Y,
  AXIS_COLOR_Z,
  AXIS_EXTENT_PADDING,
  MIN_AXIS_EXTENT,
} from '../constants';

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

/** Compute axis extent from scene bounds with padding and minimum */
function axisRange(
  bounds: SceneBounds,
  axis: 0 | 1 | 2,
): [number, number] {
  const lo = Math.min(bounds.min[axis], -MIN_AXIS_EXTENT) - AXIS_EXTENT_PADDING;
  const hi = Math.max(bounds.max[axis], MIN_AXIS_EXTENT) + AXIS_EXTENT_PADDING;
  return [lo, hi];
}

function createLineGeometry(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array([x1, y1, z1, x2, y2, z2]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  return geo;
}

// ═══════════════════════════════════════════════════════════════════
//  Materials (module-level singletons — never change)
// ═══════════════════════════════════════════════════════════════════

const MAT_X = new THREE.LineBasicMaterial({ color: AXIS_COLOR_X, transparent: true, opacity: 0.6, depthWrite: false });
const MAT_Y = new THREE.LineBasicMaterial({ color: AXIS_COLOR_Y, transparent: true, opacity: 0.6, depthWrite: false });
const MAT_Z = new THREE.LineBasicMaterial({ color: AXIS_COLOR_Z, transparent: true, opacity: 0.6, depthWrite: false });

const ORIGIN_MAT = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 });
const ORIGIN_GEO = new THREE.SphereGeometry(0.06, 12, 12);

// ═══════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════

/**
 * Three colored axis lines through origin with dynamic extent
 * based on scene bounds.
 *
 * - X → red
 * - Y → green
 * - Z → blue
 *
 * Axes auto-extend to cover all node positions plus padding,
 * with a guaranteed minimum extent of ±MIN_AXIS_EXTENT.
 */
export const AxisLines = React.memo(function AxisLines() {
  const positions = useRendererStore((s) => s.positions);

  const bounds = useMemo(() => computeSceneBounds(positions), [positions]);

  const geometries = useMemo(() => {
    const [xLo, xHi] = axisRange(bounds, 0);
    const [yLo, yHi] = axisRange(bounds, 1);
    const [zLo, zHi] = axisRange(bounds, 2);

    return {
      x: createLineGeometry(xLo, 0, 0, xHi, 0, 0),
      y: createLineGeometry(0, yLo, 0, 0, yHi, 0),
      z: createLineGeometry(0, 0, zLo, 0, 0, zHi),
    };
  }, [bounds]);

  // Dispose geometries on change / unmount
  useEffect(() => {
    return () => {
      geometries.x.dispose();
      geometries.y.dispose();
      geometries.z.dispose();
    };
  }, [geometries]);

  return (
    <group>
      <lineSegments geometry={geometries.x} material={MAT_X} renderOrder={1} />
      <lineSegments geometry={geometries.y} material={MAT_Y} renderOrder={1} />
      <lineSegments geometry={geometries.z} material={MAT_Z} renderOrder={1} />
      {/* Small origin sphere */}
      <mesh geometry={ORIGIN_GEO} material={ORIGIN_MAT} renderOrder={2} />
    </group>
  );
});