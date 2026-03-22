// groups/GroupBox.tsx

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { VrdGroup } from '@verdant/parser';
import type { ThemeColors } from '@verdant/themes';
import type { Vec3 } from '../types';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

/** Padding around the bounding box of child nodes (world units) */
const BOUNDS_PADDING = 1.5;

/** Minimum Z-extent to prevent degenerate flat boxes */
const MIN_Z_EXTENT = 0.1;

/** Opacity of the translucent group fill */
const FILL_OPACITY = 0.04;

/** Opacity of the wireframe edges */
const EDGE_OPACITY = 0.2;

// ═══════════════════════════════════════════════════════════════════
//  Shared Geometry (lazy singletons)
//
//  All GroupBox instances share the same unit cube geometry and its
//  derived edges geometry. These are scaled per-instance via the
//  `scale` prop rather than creating unique geometries.
//
//  Lazy initialization avoids GPU allocation until the first
//  GroupBox mounts — SSR-safe.
// ═══════════════════════════════════════════════════════════════════

let _boxGeometry: THREE.BoxGeometry | null = null;
let _edgesGeometry: THREE.EdgesGeometry | null = null;

function getBoxGeometry(): THREE.BoxGeometry {
  if (!_boxGeometry) {
    _boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  }
  return _boxGeometry;
}

function getEdgesGeometry(): THREE.EdgesGeometry {
  if (!_edgesGeometry) {
    _edgesGeometry = new THREE.EdgesGeometry(getBoxGeometry());
  }
  return _edgesGeometry;
}

// ═══════════════════════════════════════════════════════════════════
//  Bounding Box Computation
// ═══════════════════════════════════════════════════════════════════

interface GroupBounds {
  readonly center: Vec3;
  readonly size: Vec3;
}

/**
 * Compute the axis-aligned bounding box around a set of child positions,
 * with padding applied symmetrically.
 *
 * Returns null if there are no valid child positions
 * (the group should not be rendered in that case).
 */
function computeGroupBounds(
  childIds: readonly string[],
  positions: Readonly<Record<string, Vec3>>,
): GroupBounds | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let count = 0;

  for (let i = 0; i < childIds.length; i++) {
    const pos = positions[childIds[i]];
    if (!pos) continue;

    const x = pos[0];
    const y = pos[1];
    const z = pos[2];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
    count++;
  }

  if (count === 0) return null;

  return {
    center: [
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ],
    size: [
      maxX - minX + BOUNDS_PADDING * 2,
      maxY - minY + BOUNDS_PADDING * 2,
      Math.max(maxZ - minZ + BOUNDS_PADDING * 2, MIN_Z_EXTENT),
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Material Cache
//
//  GroupBox instances sharing the same accent color should share
//  material references. This reduces GPU state changes when
//  rendering multiple groups with the same theme.
//
//  Cache is keyed by hex color string. Materials are not disposed
//  on unmount because they're shared — they live for the app lifetime
//  (small memory footprint: 2 materials per unique color).
// ═══════════════════════════════════════════════════════════════════

interface CachedGroupMaterials {
  readonly fill: THREE.MeshBasicMaterial;
  readonly edge: THREE.LineBasicMaterial;
}

const materialCache = new Map<string, CachedGroupMaterials>();

function getGroupMaterials(accentColor: string): CachedGroupMaterials {
  let cached = materialCache.get(accentColor);
  if (cached) return cached;

  cached = {
    fill: new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: FILL_OPACITY,
      depthWrite: false,
    }),
    edge: new THREE.LineBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: EDGE_OPACITY,
    }),
  };

  materialCache.set(accentColor, cached);
  return cached;
}

// ═══════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════

interface GroupBoxProps {
  readonly group: VrdGroup;
  readonly positions: Readonly<Record<string, Vec3>>;
  readonly themeColors: ThemeColors;
}

/**
 * Renders a translucent wireframe box around a group's child nodes.
 *
 * The box is computed from the AABB (axis-aligned bounding box) of
 * the group's children, with padding to avoid clipping node meshes.
 *
 * Uses shared geometry (unit cube scaled per-instance) and cached
 * materials (keyed by accent color) for minimal GPU overhead.
 */
export const GroupBox = React.memo(
  function GroupBox({ group, positions, themeColors }: GroupBoxProps) {
    const bounds = useMemo(
      () => computeGroupBounds(group.children, positions),
      [group.children, positions],
    );

    const materials = useMemo(
      () => getGroupMaterials(themeColors.accent),
      [themeColors.accent],
    );

    if (!bounds) return null;

    const boxGeo = getBoxGeometry();
    const edgesGeo = getEdgesGeometry();

    return (
      <group position={bounds.center}>
        <mesh
          geometry={boxGeo}
          scale={bounds.size}
          material={materials.fill}
        />
        <lineSegments
          geometry={edgesGeo}
          scale={bounds.size}
          material={materials.edge}
        />
      </group>
    );
  },
  // Custom comparator: avoid re-render when positions of unrelated
  // nodes change. Only re-render if the group's children list, the
  // positions of those children, or the accent color changes.
  (prev, next) => {
    // Theme color change
    if (prev.themeColors.accent !== next.themeColors.accent) return false;

    // Children list identity (reference equality handles most cases)
    const prevChildren = prev.group.children;
    const nextChildren = next.group.children;
    if (prevChildren !== nextChildren) {
      if (prevChildren.length !== nextChildren.length) return false;
      for (let i = 0; i < prevChildren.length; i++) {
        if (prevChildren[i] !== nextChildren[i]) return false;
      }
    }

    // Check if any child's position changed
    const prevPos = prev.positions;
    const nextPos = next.positions;
    if (prevPos === nextPos) return true;

    for (let i = 0; i < prevChildren.length; i++) {
      const id = prevChildren[i];
      const p = prevPos[id];
      const n = nextPos[id];
      if (p === n) continue;
      if (!p || !n) return false;
      if (p[0] !== n[0] || p[1] !== n[1] || p[2] !== n[2]) return false;
    }

    return true;
  },
);