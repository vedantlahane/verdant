// grid/InfiniteAxes.tsx

import React, { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, MeshBasicMaterial, SphereGeometry } from 'three';
import { Html } from '@react-three/drei';
import {
  AXIS_COLOR_X,
  AXIS_COLOR_Y,
  AXIS_COLOR_Z,
  AXIS_COLOR_X_NEG,
  AXIS_COLOR_Y_NEG,
  AXIS_COLOR_Z_NEG,
  AXIS_FADE_SEGMENTS,
  AXIS_TICK_INTERVAL,
  AXIS_TICK_LABEL_INTERVAL,
  AXIS_TICK_RANGE,
  AXIS_LABEL_RANGE,
  AXIS_TICK_SIZE,
  AXIS_TICK_OPACITY,
  AXIS_LABEL_OPACITY,
  AXIS_LABEL_FONT_SIZE,
} from '../constants';
import type { AxisId, Vec3 } from '../types';
import { detectDarkMode } from '../utils';
import { useRendererStore } from '../store';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

interface FadeLineData {
  readonly geometry: BufferGeometry;
  readonly material: LineBasicMaterial;
}

interface TickGeometries {
  readonly geometry: BufferGeometry;
  readonly material: LineBasicMaterial;
}

// ═══════════════════════════════════════════════════════════════════
//  Axis → Vector mapping
// ═══════════════════════════════════════════════════════════════════

const AXIS_DIRECTIONS: Record<AxisId, [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

const AXIS_COLORS: Record<AxisId, string> = {
  x: AXIS_COLOR_X,
  y: AXIS_COLOR_Y,
  z: AXIS_COLOR_Z,
};

const AXIS_COLORS_NEG: Record<AxisId, string> = {
  x: AXIS_COLOR_X_NEG,
  y: AXIS_COLOR_Y_NEG,
  z: AXIS_COLOR_Z_NEG,
};

// ═══════════════════════════════════════════════════════════════════
//  Fade Line Builder
//
//  Creates multiple line segments per axis with decreasing opacity
//  to simulate an infinite axis that fades into the background.
//  Both positive and negative directions are generated.
// ═══════════════════════════════════════════════════════════════════

function createFadeLines(axis: AxisId): FadeLineData[] {
  const dir = AXIS_DIRECTIONS[axis];
  const color = AXIS_COLORS[axis];
  const lines: FadeLineData[] = [];

  for (const seg of AXIS_FADE_SEGMENTS) {
    // Positive direction
    const posGeo = new BufferGeometry();
    posGeo.setAttribute('position', new Float32BufferAttribute([
      dir[0] * seg.from, dir[1] * seg.from, dir[2] * seg.from,
      dir[0] * seg.to,   dir[1] * seg.to,   dir[2] * seg.to,
    ], 3));

    const posMat = new LineBasicMaterial({
      color,
      opacity: seg.opacity,
      transparent: true,
      depthWrite: false,
    });

    lines.push({ geometry: posGeo, material: posMat });

    // Negative direction — distinct muted color for visual differentiation
    const negColor = AXIS_COLORS_NEG[axis];
    const negGeo = new BufferGeometry();
    negGeo.setAttribute('position', new Float32BufferAttribute([
      -dir[0] * seg.from, -dir[1] * seg.from, -dir[2] * seg.from,
      -dir[0] * seg.to,   -dir[1] * seg.to,   -dir[2] * seg.to,
    ], 3));

    const negMat = new LineBasicMaterial({
      color: negColor,
      opacity: seg.opacity,
      transparent: true,
      depthWrite: false,
    });

    lines.push({ geometry: negGeo, material: negMat });
  }

  return lines;
}

// ═══════════════════════════════════════════════════════════════════
//  Tick Mark Builder
//
//  Creates a single BufferGeometry with all tick mark line segments
//  for one axis. Each tick is a short perpendicular line.
// ═══════════════════════════════════════════════════════════════════

function createTickGeometry(axis: AxisId): TickGeometries {
  const verts: number[] = [];
  const color = AXIS_COLORS[axis];
  const range = AXIS_TICK_RANGE;
  const interval = AXIS_TICK_INTERVAL;
  const size = AXIS_TICK_SIZE;

  for (let i = -range; i <= range; i += interval) {
    if (i === 0) continue;  // skip origin

    switch (axis) {
      case 'x':
        // Tick perpendicular to X in Y direction
        verts.push(i, -size, 0, i, size, 0);
        break;
      case 'y':
        // Tick perpendicular to Y in X direction
        verts.push(-size, i, 0, size, i, 0);
        break;
      case 'z':
        // Tick perpendicular to Z in Y direction
        verts.push(0, -size, i, 0, size, i);
        break;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(verts, 3));

  const material = new LineBasicMaterial({
    color,
    opacity: AXIS_TICK_OPACITY,
    transparent: true,
    depthWrite: false,
  });

  return { geometry, material };
}

// ═══════════════════════════════════════════════════════════════════
//  Tick Label Sub-component
// ═══════════════════════════════════════════════════════════════════

interface TickLabelProps {
  readonly axis: AxisId;
  readonly value: number;
  readonly color: string;
  readonly isDark: boolean;
}

const LABEL_OFFSET: Record<AxisId, (v: number) => [number, number, number]> = {
  x: (v) => [v, -0.4, 0],
  y: (v) => [0.4, v, 0],
  z: (v) => [0, -0.4, v],
};

const LABEL_STYLE_BASE: React.CSSProperties = {
  pointerEvents: 'none',
  userSelect: 'none',
  fontFamily: 'monospace',
  fontSize: AXIS_LABEL_FONT_SIZE,
  letterSpacing: '0.05em',
  padding: '1px 3px',
  borderRadius: '2px',
  whiteSpace: 'nowrap',
};

const TickLabel = React.memo(function TickLabel({
  axis,
  value,
  color,
  isDark,
}: TickLabelProps) {
  const position = LABEL_OFFSET[axis](value);

  const style = useMemo<React.CSSProperties>(() => ({
    ...LABEL_STYLE_BASE,
    color,
    opacity: AXIS_LABEL_OPACITY,
    background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
  }), [color, isDark]);

  return (
    <Html position={position} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
      <div style={style}>{value}</div>
    </Html>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Origin Marker
// ═══════════════════════════════════════════════════════════════════

const ORIGIN_GEO = new SphereGeometry(0.08, 12, 12);
const ORIGIN_MAT = new MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.5,
});

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════

/**
 * Three infinite-feeling axis lines through origin with:
 * - Distance-based fade (multiple segments, decreasing opacity)
 * - Tick marks at regular intervals
 * - Number labels at major intervals
 * - Small origin sphere
 */
export const InfiniteAxes = React.memo(function InfiniteAxes() {
  const themeColors = useRendererStore((s) => s.themeColors);
  const isDark = useMemo(() => detectDarkMode(), [themeColors]);

  // ── Fade lines (axis segments with decreasing opacity) ──
  const fadeLines = useMemo(() => {
    return {
      x: createFadeLines('x'),
      y: createFadeLines('y'),
      z: createFadeLines('z'),
    };
  }, []);

  // ── Tick marks ──
  const ticks = useMemo(() => ({
    x: createTickGeometry('x'),
    y: createTickGeometry('y'),
    z: createTickGeometry('z'),
  }), []);

  // ── Tick labels ──
  const labels = useMemo(() => {
    const result: Array<{ axis: AxisId; value: number }> = [];
    const range = AXIS_LABEL_RANGE;
    const interval = AXIS_TICK_LABEL_INTERVAL;

    for (const axis of ['x', 'y', 'z'] as AxisId[]) {
      for (let i = -range; i <= range; i += interval) {
        if (i === 0) continue;
        result.push({ axis, value: i });
      }
    }
    return result;
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      for (const axis of ['x', 'y', 'z'] as AxisId[]) {
        for (const line of fadeLines[axis]) {
          line.geometry.dispose();
          line.material.dispose();
        }
        ticks[axis].geometry.dispose();
        ticks[axis].material.dispose();
      }
    };
  }, [fadeLines, ticks]);

  return (
    <group>
      {/* Origin sphere */}
      <mesh geometry={ORIGIN_GEO} material={ORIGIN_MAT} renderOrder={2} />

      {/* Fade segments for each axis */}
      {(['x', 'y', 'z'] as AxisId[]).map((axis) =>
        fadeLines[axis].map((line, i) => (
          <lineSegments
            key={`${axis}-fade-${i}`}
            geometry={line.geometry}
            material={line.material}
            renderOrder={1}
          />
        ))
      )}

      {/* Tick marks */}
      {(['x', 'y', 'z'] as AxisId[]).map((axis) => (
        <lineSegments
          key={`${axis}-ticks`}
          geometry={ticks[axis].geometry}
          material={ticks[axis].material}
          renderOrder={1}
        />
      ))}

      {/* Tick labels */}
      {labels.map(({ axis, value }) => (
        <TickLabel
          key={`${axis}-label-${value}`}
          axis={axis}
          value={value}
          color={value < 0 ? AXIS_COLORS_NEG[axis] : AXIS_COLORS[axis]}
          isDark={isDark}
        />
      ))}
    </group>
  );
});