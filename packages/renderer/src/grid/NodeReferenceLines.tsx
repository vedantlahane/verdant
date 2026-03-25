// grid/NodeReferenceBox.tsx

import React, { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry, LineDashedMaterial } from 'three';
import { Html } from '@react-three/drei';
import { useRendererStore } from '../store';
import { detectDarkMode } from '../utils';
import type { Vec3 } from '../types';
import {
  AXIS_COLOR_X,
  AXIS_COLOR_Y,
  AXIS_COLOR_Z,
  REFERENCE_BOX_OPACITY,
  REFERENCE_BOX_OPACITY_FAINT,
  REFERENCE_BOX_DASH_SIZE,
  REFERENCE_BOX_GAP_SIZE,
  REFERENCE_BOX_MIN_DIM,
  REFERENCE_LABEL_FONT_SIZE,
} from '../constants';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

interface BoxEdges {
  readonly xEdges: BufferGeometry;   // Edges parallel to X (red)
  readonly yEdges: BufferGeometry;   // Edges parallel to Y (green)
  readonly zEdges: BufferGeometry;   // Edges parallel to Z (blue)
}

// ═══════════════════════════════════════════════════════════════════
//  Wireframe Box Builder
//
//  Given a node position (x, y, z), creates a wireframe cuboid
//  from (0,0,0) to (x,y,z) with 12 edges colored by their axis.
//
//  Edge layout:
//    X-parallel (red):  4 edges connecting x=0 to x=X
//    Y-parallel (green): 4 edges connecting y=0 to y=Y
//    Z-parallel (blue):  4 edges connecting z=0 to z=Z
// ═══════════════════════════════════════════════════════════════════

function createBoxEdges(x: number, y: number, z: number): BoxEdges {
  // X-parallel edges (4 edges from x=0 to x=X at each YZ corner)
  const xVerts = new Float32Array([
    0, 0, 0,   x, 0, 0,    // bottom-near
    0, y, 0,   x, y, 0,    // top-near
    0, 0, z,   x, 0, z,    // bottom-far
    0, y, z,   x, y, z,    // top-far
  ]);

  // Y-parallel edges (4 edges from y=0 to y=Y at each XZ corner)
  const yVerts = new Float32Array([
    0, 0, 0,   0, y, 0,    // origin
    x, 0, 0,   x, y, 0,    // right-near
    0, 0, z,   0, y, z,    // left-far
    x, 0, z,   x, y, z,    // right-far
  ]);

  // Z-parallel edges (4 edges from z=0 to z=Z at each XY corner)
  const zVerts = new Float32Array([
    0, 0, 0,   0, 0, z,    // origin
    x, 0, 0,   x, 0, z,    // right-bottom
    0, y, 0,   0, y, z,    // left-top
    x, y, 0,   x, y, z,    // right-top
  ]);

  const makeGeo = (verts: Float32Array): BufferGeometry => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(verts, 3));

    // Compute line distances for dashed material
    const distances = new Float32Array(verts.length / 3);
    for (let i = 0; i < verts.length / 3; i += 2) {
      const dx = verts[i * 3 + 3] - verts[i * 3];
      const dy = verts[i * 3 + 4] - verts[i * 3 + 1];
      const dz = verts[i * 3 + 5] - verts[i * 3 + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      distances[i] = 0;
      distances[i + 1] = d;
    }
    geo.setAttribute('lineDistance', new BufferAttribute(distances, 1));

    return geo;
  };

  return {
    xEdges: makeGeo(xVerts),
    yEdges: makeGeo(yVerts),
    zEdges: makeGeo(zVerts),
  };
}

function createDashedMaterial(color: string, opacity: number): LineDashedMaterial {
  return new LineDashedMaterial({
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    dashSize: REFERENCE_BOX_DASH_SIZE,
    gapSize: REFERENCE_BOX_GAP_SIZE,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Coordinate Label
// ═══════════════════════════════════════════════════════════════════

interface CoordLabelProps {
  readonly position: [number, number, number];
  readonly text: string;
  readonly color: string;
  readonly isDark: boolean;
}

const COORD_LABEL_CONTAINER: React.CSSProperties = {
  pointerEvents: 'none',
  userSelect: 'none',
};

const CoordLabel = React.memo(function CoordLabel({
  position,
  text,
  color,
  isDark,
}: CoordLabelProps) {
  const style = useMemo<React.CSSProperties>(() => ({
    fontFamily: 'monospace',
    fontSize: REFERENCE_LABEL_FONT_SIZE,
    color,
    padding: '1px 4px',
    borderRadius: '2px',
    background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
    border: `1px solid ${color}33`,
  }), [color, isDark]);

  return (
    <Html position={position} center distanceFactor={16} style={COORD_LABEL_CONTAINER}>
      <div style={style}>{text}</div>
    </Html>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Single Node Box
// ═══════════════════════════════════════════════════════════════════

interface SingleNodeBoxProps {
  readonly position: Vec3;
  readonly opacity: number;
  readonly showLabels: boolean;
  readonly isDark: boolean;
}

const SingleNodeBox = React.memo(function SingleNodeBox({
  position,
  opacity,
  showLabels,
  isDark,
}: SingleNodeBoxProps) {
  const [x, y, z] = position;

  const { edges, materials } = useMemo(() => {
    const e = createBoxEdges(x, y, z);
    const m = {
      x: createDashedMaterial(AXIS_COLOR_X, opacity),
      y: createDashedMaterial(AXIS_COLOR_Y, opacity),
      z: createDashedMaterial(AXIS_COLOR_Z, opacity),
    };
    return { edges: e, materials: m };
  }, [x, y, z, opacity]);

  useEffect(() => {
    return () => {
      edges.xEdges.dispose();
      edges.yEdges.dispose();
      edges.zEdges.dispose();
      materials.x.dispose();
      materials.y.dispose();
      materials.z.dispose();
    };
  }, [edges, materials]);

  // Coordinate labels at midpoints of the origin-adjacent edges
  const showX = Math.abs(x) > REFERENCE_BOX_MIN_DIM;
  const showY = Math.abs(y) > REFERENCE_BOX_MIN_DIM;
  const showZ = Math.abs(z) > REFERENCE_BOX_MIN_DIM;

  return (
    <group>
      {showX && <lineSegments geometry={edges.xEdges} material={materials.x} renderOrder={0} />}
      {showY && <lineSegments geometry={edges.yEdges} material={materials.y} renderOrder={0} />}
      {showZ && <lineSegments geometry={edges.zEdges} material={materials.z} renderOrder={0} />}

      {showLabels && (
        <>
          {showX && (
            <CoordLabel
              position={[x / 2, -0.3, 0]}
              text={`X: ${x.toFixed(1)}`}
              color={AXIS_COLOR_X}
              isDark={isDark}
            />
          )}
          {showY && (
            <CoordLabel
              position={[-0.3, y / 2, 0]}
              text={`Y: ${y.toFixed(1)}`}
              color={AXIS_COLOR_Y}
              isDark={isDark}
            />
          )}
          {showZ && (
            <CoordLabel
              position={[0, -0.3, z / 2]}
              text={`Z: ${z.toFixed(1)}`}
              color={AXIS_COLOR_Z}
              isDark={isDark}
            />
          )}
          {/* Combined coordinate label near the node */}
          <CoordLabel
            position={[x, y + 0.8, z]}
            text={`(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`}
            color={'#ffffff'}
            isDark={isDark}
          />
        </>
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════

export interface NodeReferenceBoxProps {
  /** 'selected' = only selected/hovered, 'all' = every node (faint) */
  readonly mode?: 'selected' | 'all';
}

/**
 * Per-node wireframe cuboid from origin to node position.
 *
 * The cuboid's 12 edges are colored by the axis they're parallel to:
 * - X edges → red
 * - Y edges → green
 * - Z edges → blue
 *
 * Coordinate labels show the exact X, Y, Z values.
 * In 'selected' mode, only selected/hovered nodes get the full box + labels.
 */
export const NodeReferenceBox = React.memo(function NodeReferenceBox({
  mode = 'selected',
}: NodeReferenceBoxProps) {
  const positions = useRendererStore((s) => s.positions);
  const selectionSet = useRendererStore((s) => s.selectionSet);
  const hoveredNodeId = useRendererStore((s) => s.hoveredNodeId);
  const themeColors = useRendererStore((s) => s.themeColors);
  const isDark = useMemo(() => detectDarkMode(), [themeColors]);

  const nodes = useMemo(() => {
    const result: Array<{
      id: string;
      position: Vec3;
      opacity: number;
      showLabels: boolean;
    }> = [];

    if (mode === 'all') {
      for (const [id, pos] of Object.entries(positions)) {
        const isActive = selectionSet.has(id) || hoveredNodeId === id;
        result.push({
          id,
          position: pos,
          opacity: isActive ? REFERENCE_BOX_OPACITY : REFERENCE_BOX_OPACITY_FAINT,
          showLabels: isActive,
        });
      }
    } else {
      for (const id of selectionSet) {
        const pos = positions[id];
        if (pos) result.push({ id, position: pos, opacity: REFERENCE_BOX_OPACITY, showLabels: true });
      }
      if (hoveredNodeId && !selectionSet.has(hoveredNodeId)) {
        const pos = positions[hoveredNodeId];
        if (pos) result.push({ id: hoveredNodeId, position: pos, opacity: REFERENCE_BOX_OPACITY, showLabels: true });
      }
    }

    return result;
  }, [positions, selectionSet, hoveredNodeId, mode]);

  if (nodes.length === 0) return null;

  return (
    <group>
      {nodes.map((node) => (
        <SingleNodeBox
          key={node.id}
          position={node.position}
          opacity={node.opacity}
          showLabels={node.showLabels}
          isDark={isDark}
        />
      ))}
    </group>
  );
});