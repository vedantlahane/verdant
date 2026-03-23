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

interface DimensionLineProps extends MeasurementLine {
  readonly accentColor: string;
}

const LABEL_Y_OFFSET = 0.35;
const LABEL_DISTANCE_FACTOR = 18;
const LABEL_FONT_SIZE = '9px';

const LABEL_CONTAINER_STYLE: React.CSSProperties = {
  pointerEvents: 'none',
  userSelect: 'none',
};

// ═══════════════════════════════════════════════════════════════════
//  Geometry Builders
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
 * Bug #8 fix: The old code created a temporary `THREE.Line(geometry)`
 * and called `computeLineDistances()`, but then used `tmpLine.geometry`
 * which is the *same reference* as `geometry` — the tmpLine itself was
 * never disposed and leaked.
 *
 * Fix: We still need `computeLineDistances()` which requires a Line
 * object, but we now properly dispose the temporary Line. The geometry
 * survives because Three.js Line doesn't own/dispose its geometry.
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

  // computeLineDistances requires a Line object — create temporarily
  const tmpLine = new THREE.Line(geometry);
  tmpLine.computeLineDistances();
  // Detach geometry so disposing tmpLine doesn't take it with it       ← CHANGED
  tmpLine.geometry = new THREE.BufferGeometry();                       // ← CHANGED: orphan with empty geo
  tmpLine.geometry.dispose();                                          // ← CHANGED: dispose the empty one
  // tmpLine itself will be GC'd — no scene reference holds it

  const material = new THREE.LineDashedMaterial({
    color,
    dashSize: DASH_SIZE,
    gapSize: GAP_SIZE,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  return { geometry, material };
}

/** Reusable vectors for wing computation (zero alloc in hot path) */    // ← NEW
const _wingDir = new THREE.Vector3();
const _wingPerp = new THREE.Vector3();
const _wingUp = new THREE.Vector3(0, 1, 0);
const _wingRight = new THREE.Vector3(1, 0, 0);

function createWingResources(
  from: Vec3,
  to: Vec3,
  color: string,
): WingResources {
  _wingDir.set(                                                        // ← CHANGED: reuse
    to[0] - from[0],
    to[1] - from[1],
    to[2] - from[2],
  ).normalize();

  _wingPerp.crossVectors(_wingDir, _wingUp);                          // ← CHANGED: reuse

  if (_wingPerp.lengthSq() < 0.001) {
    _wingPerp.crossVectors(_wingDir, _wingRight);
  }
  _wingPerp.normalize();

  const W = WING_HALF_WIDTH;
  const px = _wingPerp.x * W;
  const py = _wingPerp.y * W;
  const pz = _wingPerp.z * W;

  const vertices = new Float32Array([
    from[0] + px, from[1] + py, from[2] + pz,
    from[0] - px, from[1] - py, from[2] - pz,
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

export const DimensionLine = React.memo(function DimensionLine({
  from,
  to,
  label,
  direction,
  accentColor,
}: DimensionLineProps) {
  const lineColor = direction === 'outgoing' ? accentColor : '#e57373';

  const fromKey = vec3Key(from);
  const toKey = vec3Key(to);
  const endpointKey = `${fromKey}|${toKey}`;

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

  useEffect(() => () => {
    lineRes.geometry.dispose();
    lineRes.material.dispose();
  }, [lineRes]);

  useEffect(() => () => {
    wingRes.geometry.dispose();
    wingRes.material.dispose();
  }, [wingRes]);

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

  const opacityRef = useRef(0);
  const animDone = useRef(false);
  const labelDivRef = useRef<HTMLDivElement>(null);

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