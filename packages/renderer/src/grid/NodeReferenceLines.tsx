// grid/NodeReferenceLines.tsx

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useRendererStore } from '../store';
import type { Vec3 } from '../types';
import {
  AXIS_COLOR_X,
  AXIS_COLOR_Y,
  AXIS_COLOR_Z,
  REFERENCE_LINE_OPACITY,
  REFERENCE_LINE_OPACITY_FAINT,
  REFERENCE_LINE_DASH_SIZE,
  REFERENCE_LINE_GAP_SIZE,
} from '../constants';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

interface RefLineData {
  readonly nodeId: string;
  readonly position: Vec3;
  readonly opacity: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Materials (created once per opacity level)
// ═══════════════════════════════════════════════════════════════════

function createDashedMaterial(color: string, opacity: number): THREE.LineDashedMaterial {
  return new THREE.LineDashedMaterial({
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    dashSize: REFERENCE_LINE_DASH_SIZE,
    gapSize: REFERENCE_LINE_GAP_SIZE,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Single Node Reference Lines
// ═══════════════════════════════════════════════════════════════════

interface SingleNodeLinesProps {
  readonly position: Vec3;
  readonly opacity: number;
}

const SingleNodeLines = React.memo(function SingleNodeLines({
  position,
  opacity,
}: SingleNodeLinesProps) {
  const [x, y, z] = position;

  const { geometries, materials } = useMemo(() => {
    // Vertical drop: node → XZ plane (Y=0)
    const dropGeo = new THREE.BufferGeometry();
    dropGeo.setAttribute('position', new THREE.Float32BufferAttribute([x, y, z, x, 0, z], 3));

    // Ground to X-axis: (x, 0, z) → (x, 0, 0)
    const toXGeo = new THREE.BufferGeometry();
    toXGeo.setAttribute('position', new THREE.Float32BufferAttribute([x, 0, z, x, 0, 0], 3));

    // Ground to Z-axis: (x, 0, z) → (0, 0, z)
    const toZGeo = new THREE.BufferGeometry();
    toZGeo.setAttribute('position', new THREE.Float32BufferAttribute([x, 0, z, 0, 0, z], 3));

    const geos = [dropGeo, toXGeo, toZGeo];

    // Compute line distances for dashing
    for (const g of geos) {
      const pos = g.getAttribute('position');
      const d = Math.sqrt(
        (pos.getX(1) - pos.getX(0)) ** 2 +
        (pos.getY(1) - pos.getY(0)) ** 2 +
        (pos.getZ(1) - pos.getZ(0)) ** 2,
      );
      g.setAttribute('lineDistance', new THREE.Float32BufferAttribute([0, d], 1));
    }

    const mats = {
      drop: createDashedMaterial(AXIS_COLOR_Y, opacity),
      toX: createDashedMaterial(AXIS_COLOR_Z, opacity),
      toZ: createDashedMaterial(AXIS_COLOR_X, opacity),
    };

    return { geometries: { drop: dropGeo, toX: toXGeo, toZ: toZGeo }, materials: mats };
  }, [x, y, z, opacity]);

  useEffect(() => {
    return () => {
      geometries.drop.dispose();
      geometries.toX.dispose();
      geometries.toZ.dispose();
      materials.drop.dispose();
      materials.toX.dispose();
      materials.toZ.dispose();
    };
  }, [geometries, materials]);

  return (
    <group>
      <lineSegments geometry={geometries.drop} material={materials.drop} renderOrder={0} />
      <lineSegments geometry={geometries.toX} material={materials.toX} renderOrder={0} />
      <lineSegments geometry={geometries.toZ} material={materials.toZ} renderOrder={0} />
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════

export interface NodeReferenceLinesProps {
  /** 'selected' = only selected/hovered, 'all' = every node (faint) */
  readonly mode?: 'selected' | 'all';
}

/**
 * Per-node coordinate reference lines projecting from each node
 * to the axis planes.
 *
 * For each node renders:
 * - Vertical drop-line from node to Y=0 (green, shows height)
 * - Line from ground point to X-axis (blue, shows Z coordinate)
 * - Line from ground point to Z-axis (red, shows X coordinate)
 *
 * In 'selected' mode (default), only selected/hovered nodes get lines.
 * In 'all' mode, every node gets very faint lines.
 */
export const NodeReferenceLines = React.memo(function NodeReferenceLines({
  mode = 'selected',
}: NodeReferenceLinesProps) {
  const positions = useRendererStore((s) => s.positions);
  const selectionSet = useRendererStore((s) => s.selectionSet);
  const hoveredNodeId = useRendererStore((s) => s.hoveredNodeId);

  const lines: RefLineData[] = useMemo(() => {
    const result: RefLineData[] = [];

    if (mode === 'all') {
      for (const [id, pos] of Object.entries(positions)) {
        const isActive = selectionSet.has(id) || hoveredNodeId === id;
        result.push({
          nodeId: id,
          position: pos,
          opacity: isActive ? REFERENCE_LINE_OPACITY : REFERENCE_LINE_OPACITY_FAINT,
        });
      }
    } else {
      // Selected + hovered only
      for (const id of selectionSet) {
        const pos = positions[id];
        if (pos) result.push({ nodeId: id, position: pos, opacity: REFERENCE_LINE_OPACITY });
      }
      if (hoveredNodeId && !selectionSet.has(hoveredNodeId)) {
        const pos = positions[hoveredNodeId];
        if (pos) result.push({ nodeId: hoveredNodeId, position: pos, opacity: REFERENCE_LINE_OPACITY });
      }
    }

    return result;
  }, [positions, selectionSet, hoveredNodeId, mode]);

  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line) => (
        <SingleNodeLines
          key={line.nodeId}
          position={line.position}
          opacity={line.opacity}
        />
      ))}
    </group>
  );
});