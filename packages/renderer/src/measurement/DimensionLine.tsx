// measurement/DimensionLine.tsx

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { MeasurementLine, Vec3 } from '../types';
import {
  DASH_SIZE,
  GAP_SIZE,
  WING_HALF_WIDTH,
  MEASUREMENT_LINE_OPACITY,
  MEASUREMENT_WING_OPACITY,
  MEASUREMENT_FADE_SPEED,
} from '../constants';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

interface DimensionLineProps extends MeasurementLine {
  readonly accentColor: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

/** Y-offset for the label position above the midpoint */
const LABEL_Y_OFFSET = 0.35;

/** Distance factor for Html billboard scaling */
const LABEL_DISTANCE_FACTOR = 18;

/** Font size for measurement label */
const LABEL_FONT_SIZE = '9px';

const LABEL_CONTAINER_STYLE: React.CSSProperties = {
  pointerEvents: 'none',
  userSelect: 'none',
};

// ═══════════════════════════════════════════════════════════════════
//  Geometry Builders
//
//  Pure functions that produce disposable GPU resources.
//  Each returns the geometry + material pair so the caller can
//  manage disposal uniformly.
// ═══════════════════════════════════════════════════════════════════

interface LineResources {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.LineDashedMaterial;
}

interface WingResources {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.LineBasicMaterial;
}

/**
 * Create the dashed line between two endpoints.
 *
 * Uses LineDashedMaterial which requires `computeLineDistances()`
 * to be called on the geometry. We create a temporary Line3D,
 * compute distances, then extract the geometry.
 */
function createLineResources(
  from: Vec3,
  to: Vec3,
  color: string,
): LineResources {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [from[0], from[1], from[2], to[0], to[1], to[2]],
      3,
    ),
  );

  // computeLineDistances requires a Line object
  const tmpLine = new THREE.Line(geometry);
  tmpLine.computeLineDistances();
  const finalGeometry = tmpLine.geometry;

  const material = new THREE.LineDashedMaterial({
    color,
    dashSize: DASH_SIZE,
    gapSize: GAP_SIZE,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  return { geometry: finalGeometry, material };
}

/**
 * Create perpendicular wing markers at the line endpoints.
 *
 * Wings are short line segments perpendicular to the measurement
 * direction, providing visual anchors at the from/to positions.
 *
 * The perpendicular direction is computed via cross product with
 * world-up. Falls back to world-right if the measurement line is
 * vertical (parallel to up).
 */
function createWingResources(
  from: Vec3,
  to: Vec3,
  color: string,
): WingResources {
  const dir = new THREE.Vector3(
    to[0] - from[0],
    to[1] - from[1],
    to[2] - from[2],
  ).normalize();

  const up = new THREE.Vector3(0, 1, 0);
  const perp = new THREE.Vector3().crossVectors(dir, up);

  // If line is nearly vertical, cross product is degenerate → use right vector
  if (perp.lengthSq() < 0.001) {
    perp.crossVectors(dir, new THREE.Vector3(1, 0, 0));
  }
  perp.normalize();

  const W = WING_HALF_WIDTH;
  const px = perp.x * W;
  const py = perp.y * W;
  const pz = perp.z * W;

  const vertices = new Float32Array([
    // Wing at "from"
    from[0] + px, from[1] + py, from[2] + pz,
    from[0] - px, from[1] - py, from[2] - pz,
    // Wing at "to"
    to[0] + px, to[1] + py, to[2] + pz,
    to[0] - px, to[1] - py, to[2] - pz,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  return { geometry, material };
}

// ═══════════════════════════════════════════════════════════════════
//  Derived Data Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a stable string key from a Vec3 for memo dependency.
 * Avoids re-computation when the same position is passed as a
 * new array reference with identical values.
 */
function vec3Key(v: Vec3): string {
  return `${v[0]},${v[1]},${v[2]}`;
}

function computeDistance(from: Vec3, to: Vec3): number {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function computeMidpoint(from: Vec3, to: Vec3): Vec3 {
  return [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2 + LABEL_Y_OFFSET,
    (from[2] + to[2]) / 2,
  ];
}

// ═══════════════════════════════════════════════════════════════════
//  Label Sub-component
//
//  Extracted to isolate the Html overlay (which is expensive due to
//  CSS layout) from the Three.js geometry updates.
// ═══════════════════════════════════════════════════════════════════

interface MeasurementLabelProps {
  readonly position: Vec3;
  readonly distance: number;
  readonly label?: string;
  readonly direction: 'outgoing' | 'incoming';
  readonly color: string;
  readonly divRef: React.RefObject<HTMLDivElement | null>;
}

const MeasurementLabel = React.memo(function MeasurementLabel({
  position,
  distance,
  label,
  direction,
  color,
  divRef,
}: MeasurementLabelProps) {
  const labelStyle = useMemo<React.CSSProperties>(
    () => ({
      opacity: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: LABEL_FONT_SIZE,
      letterSpacing: '0.12em',
      color,
      background: 'color-mix(in srgb, var(--page-bg) 85%, transparent)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      padding: '2px 6px',
      borderRadius: '1px',
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }),
    [color],
  );

  const arrow = direction === 'outgoing' ? '→' : '←';

  return (
    <Html
      position={position}
      center
      distanceFactor={LABEL_DISTANCE_FACTOR}
      style={LABEL_CONTAINER_STYLE}
    >
      <div ref={divRef} style={labelStyle}>
        <span style={{ opacity: 0.5 }}>{arrow}</span>
        <span>{distance.toFixed(1)}u</span>
        {label && (
          <span style={{ opacity: 0.6, marginLeft: '2px' }}>
            &quot;{label}&quot;
          </span>
        )}
      </div>
    </Html>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════

/**
 * Renders a measurement line between two 3D positions with:
 * - Dashed line connecting the endpoints
 * - Perpendicular wing markers at each endpoint
 * - Billboard label showing distance and optional edge label
 * - Fade-in animation on appearance
 *
 * Resources (geometry + material) are created when endpoints change
 * and disposed via useEffect cleanup.
 */
export const DimensionLine = React.memo(function DimensionLine({
  from,
  to,
  label,
  direction,
  accentColor,
}: DimensionLineProps) {
  const lineColor = direction === 'outgoing' ? accentColor : '#e57373';

  // Stable keys for memo dependencies (arrays are new refs each render)
  const fromKey = vec3Key(from);
  const toKey = vec3Key(to);
  const endpointKey = `${fromKey}|${toKey}`;

  // ── GPU Resources ──

  const lineRes = useMemo(
    () => createLineResources(from, to, lineColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpointKey, lineColor],
  );

  const wingRes = useMemo(
    () => createWingResources(from, to, lineColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpointKey, lineColor],
  );

  // Dispose on dependency change or unmount
  useEffect(() => () => {
    lineRes.geometry.dispose();
    lineRes.material.dispose();
  }, [lineRes]);

  useEffect(() => () => {
    wingRes.geometry.dispose();
    wingRes.material.dispose();
  }, [wingRes]);

  // ── Derived data ──

  const distance = useMemo(
    () => computeDistance(from, to),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpointKey],
  );

  const midpoint = useMemo(
    () => computeMidpoint(from, to),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpointKey],
  );

  // ── Fade-in animation ──

  const opacityRef = useRef(0);
  const animDone = useRef(false);
  const labelDivRef = useRef<HTMLDivElement>(null);

  // Reset animation when endpoints change
  useEffect(() => {
    opacityRef.current = 0;
    animDone.current = false;
  }, [endpointKey]);

  useFrame((_, delta) => {
    if (animDone.current) return;

    opacityRef.current = Math.min(1, opacityRef.current + delta * MEASUREMENT_FADE_SPEED);
    const t = opacityRef.current;

    lineRes.material.opacity = t * MEASUREMENT_LINE_OPACITY;
    wingRes.material.opacity = t * MEASUREMENT_WING_OPACITY;

    if (labelDivRef.current) {
      labelDivRef.current.style.opacity = String(t);
    }

    if (t >= 1) {
      animDone.current = true;
    }
  });

  return (
    <group>
      <lineSegments geometry={lineRes.geometry} material={lineRes.material} />
      <lineSegments geometry={wingRes.geometry} material={wingRes.material} />
      <MeasurementLabel
        position={midpoint}
        distance={distance}
        label={label}
        direction={direction}
        color={lineColor}
        divRef={labelDivRef}
      />
    </group>
  );
});