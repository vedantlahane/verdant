// grid/createGridGeometries.ts

import * as THREE from 'three';
import type { TickData, Vec3 } from '../types';
import {
  GRID_SIZE,
  AXIS_Y_LENGTH,
  AXIS_LENGTH,
  MAJOR_STEP,
  MINOR_STEP,
  TICK_SIZE,
  TICK_EVERY,
} from '../constants';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface GridGeometries {
  // Axes
  readonly xAxis: THREE.BufferGeometry;
  readonly yAxis: THREE.BufferGeometry;
  readonly zAxisPos: THREE.BufferGeometry;
  readonly zAxisNeg: THREE.BufferGeometry;

  // Grid lines
  readonly xzMinor: THREE.BufferGeometry;
  readonly xzMajor: THREE.BufferGeometry;
  readonly yzMinor: THREE.BufferGeometry;
  readonly yzMajor: THREE.BufferGeometry;
  readonly xyMinor: THREE.BufferGeometry;
  readonly xyMajor: THREE.BufferGeometry;

  // Translucent panels behind grid lines
  readonly xzPanel: THREE.PlaneGeometry;
  readonly yzPanel: THREE.PlaneGeometry;
  readonly xyPanel: THREE.PlaneGeometry;

  // Origin markers
  readonly crosshair: THREE.BufferGeometry;
  readonly ring: THREE.RingGeometry;
  readonly sphere: THREE.SphereGeometry;

  // Tick marks
  readonly tickBox: THREE.BoxGeometry;

  // Axis arrow tips
  readonly arrow: THREE.ConeGeometry;
}

// ═══════════════════════════════════════════════════════════════════
//  Grid Plane Type
// ═══════════════════════════════════════════════════════════════════

type GridPlane = 'xz' | 'yz' | 'xy';

// ═══════════════════════════════════════════════════════════════════
//  Internal Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a BufferGeometry from a flat array of vertex positions.
 * Used for line segments where each consecutive pair of Vec3
 * defines one line.
 */
function createLineGeometry(vertices: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  return geo;
}

/**
 * Push a single line segment (two endpoints) into the vertex array.
 * Avoids the spread operator overhead of `vertices.push(...from, ...to)`.
 */
function pushLine(
  out: number[],
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
): void {
  out.push(x1, y1, z1, x2, y2, z2);
}

// ═══════════════════════════════════════════════════════════════════
//  Grid Line Builders
//
//  Each plane (XZ, YZ, XY) has minor and major grid lines.
//  - Minor: every MINOR_STEP, excluding major lines and axis (i===0)
//  - Major: every MAJOR_STEP, excluding axis (i===0)
//
//  Lines span the full [-GRID_SIZE, +GRID_SIZE] range in both
//  directions of the plane.
// ═══════════════════════════════════════════════════════════════════

/**
 * Line emitter for a given plane.
 *
 * Rather than a switch inside a loop (branch prediction miss on every
 * iteration), we select the emitter function once and call it N times.
 */
type LineEmitter = (out: number[], i: number, size: number) => void;

const LINE_EMITTERS: Readonly<Record<GridPlane, LineEmitter>> = {
  xz: (out, i, s) => {
    pushLine(out, i, 0, -s, i, 0, s);
    pushLine(out, -s, 0, i, s, 0, i);
  },
  yz: (out, i, s) => {
    pushLine(out, 0, i, -s, 0, i, s);
    pushLine(out, 0, -s, i, 0, s, i);
  },
  xy: (out, i, s) => {
    pushLine(out, -s, i, 0, s, i, 0);
    pushLine(out, i, -s, 0, i, s, 0);
  },
};

function buildGridLines(
  plane: GridPlane,
  step: number,
  excludeMultiplesOf?: number,
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const emit = LINE_EMITTERS[plane];

  for (let i = -GRID_SIZE; i <= GRID_SIZE; i += step) {
    // Skip the center axis line
    if (i === 0) continue;
    // Skip lines that belong to a coarser grid level
    if (excludeMultiplesOf !== undefined && i % excludeMultiplesOf === 0) continue;

    emit(vertices, i, GRID_SIZE);
  }

  return createLineGeometry(vertices);
}

// ═══════════════════════════════════════════════════════════════════
//  Axis Geometries
// ═══════════════════════════════════════════════════════════════════

/** Small Y offsets to prevent z-fighting with the ground plane */
const AXIS_Y_OFFSET = 0.015;
const Z_AXIS_Y_OFFSET = 0.03;

function buildAxisGeometries() {
  return {
    xAxis: createLineGeometry([
      -AXIS_LENGTH, AXIS_Y_OFFSET, 0,
       AXIS_LENGTH, AXIS_Y_OFFSET, 0,
    ]),
    yAxis: createLineGeometry([
      0, -AXIS_Y_LENGTH, 0,
      0,  AXIS_Y_LENGTH, 0,
    ]),
    zAxisPos: createLineGeometry([
      0, Z_AXIS_Y_OFFSET, 0,
      0, Z_AXIS_Y_OFFSET, AXIS_LENGTH,
    ]),
    zAxisNeg: createLineGeometry([
      0, Z_AXIS_Y_OFFSET, -AXIS_LENGTH,
      0, Z_AXIS_Y_OFFSET, 0,
    ]),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Origin Markers
// ═══════════════════════════════════════════════════════════════════

const CROSSHAIR_HALF = 0.5;
const CROSSHAIR_Y = 0.005;
const RING_INNER = 0.35;
const RING_OUTER = 0.4;
const RING_SEGMENTS = 32;
const SPHERE_RADIUS = 0.06;
const SPHERE_SEGMENTS = 12;

function buildOriginGeometries() {
  return {
    crosshair: createLineGeometry([
      -CROSSHAIR_HALF, CROSSHAIR_Y, 0,
       CROSSHAIR_HALF, CROSSHAIR_Y, 0,
      0, CROSSHAIR_Y, -CROSSHAIR_HALF,
      0, CROSSHAIR_Y,  CROSSHAIR_HALF,
    ]),
    ring: new THREE.RingGeometry(RING_INNER, RING_OUTER, RING_SEGMENTS),
    sphere: new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Arrow & Tick Geometries
// ═══════════════════════════════════════════════════════════════════

const ARROW_RADIUS = 0.12;
const ARROW_HEIGHT = 0.4;
const ARROW_SEGMENTS = 8;

function buildSmallGeometries() {
  return {
    tickBox: new THREE.BoxGeometry(TICK_SIZE, TICK_SIZE, TICK_SIZE),
    arrow: new THREE.ConeGeometry(ARROW_RADIUS, ARROW_HEIGHT, ARROW_SEGMENTS),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create all geometries needed for the coordinate grid.
 *
 * All geometries are allocated on the GPU when first attached to a
 * mesh/line. Callers MUST call `disposeGridGeometries` when the grid
 * unmounts to free GPU memory.
 *
 * The function is designed to be called once (inside a `useMemo`)
 * and the result stored for the component's lifetime.
 */
export function createGridGeometries(): GridGeometries {
  const panelSize = GRID_SIZE * 2;

  return {
    // Axes
    ...buildAxisGeometries(),

    // Grid lines: minor excludes major multiples, major excludes axis
    xzMinor: buildGridLines('xz', MINOR_STEP, MAJOR_STEP),
    xzMajor: buildGridLines('xz', MAJOR_STEP),
    yzMinor: buildGridLines('yz', MINOR_STEP, MAJOR_STEP),
    yzMajor: buildGridLines('yz', MAJOR_STEP),
    xyMinor: buildGridLines('xy', MINOR_STEP, MAJOR_STEP),
    xyMajor: buildGridLines('xy', MAJOR_STEP),

    // Panels
    xzPanel: new THREE.PlaneGeometry(panelSize, panelSize),
    yzPanel: new THREE.PlaneGeometry(panelSize, panelSize),
    xyPanel: new THREE.PlaneGeometry(panelSize, panelSize),

    // Origin
    ...buildOriginGeometries(),

    // Small shared geometries
    ...buildSmallGeometries(),
  };
}

/**
 * Dispose all geometries in the collection.
 *
 * Safe to call multiple times — `BufferGeometry.dispose()` is idempotent.
 */
export function disposeGridGeometries(geometries: GridGeometries): void {
  const values = Object.values(geometries);
  for (let i = 0; i < values.length; i++) {
    const geo = values[i];
    if (geo && typeof (geo as any).dispose === 'function') {
      (geo as any).dispose();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Tick Data Computation
//
//  Generates the set of tick marks to display along each axis.
//  This is pure data (no GPU resources) — safe to call multiple times.
//
//  Labeling rule: show ticks at positions where |value| ≡ 1 (mod 4).
//  This gives labels at ±1, ±5, ±9, ±13, ... which avoids crowding
//  while still providing orientation cues at regular intervals.
// ═══════════════════════════════════════════════════════════════════

/**
 * Determine whether a tick value should be labeled.
 *
 * Pattern: label at 0 and at values where (|v| - 1) is divisible by 4.
 * Produces: 0, ±1, ±5, ±9, ±13, ±17, ...
 */
function shouldLabel(v: number): boolean {
  if (v === 0) return true;
  return (Math.abs(v) - 1) % 4 === 0;
}

export function computeTickData(): TickData[] {
  // Pre-calculate expected count for array pre-allocation.
  // For AXIS_LENGTH=40:
  //   X axis: ~20 ticks, Z axis: ~20 ticks, Y axis: ~20 ticks
  //   + 1 for origin = ~61 total
  const estimatedCount = Math.ceil(AXIS_LENGTH / 2) * 2 + // X ticks
                         Math.ceil(AXIS_LENGTH / 2) * 2 + // Z ticks
                         Math.ceil(AXIS_Y_LENGTH / 2) * 2 + // Y ticks
                         1; // origin
  const ticks: TickData[] = new Array(estimatedCount);
  let count = 0;

  // Origin tick
  ticks[count++] = { pos: [0, 0, 0], axis: 'x', val: 0 };

  // X and Z axis ticks
  const xzCount = Math.floor(AXIS_LENGTH);
  for (let i = -xzCount; i <= xzCount; i++) {
    if (i === 0 || !shouldLabel(i)) continue;
    ticks[count++] = { pos: [i, 0, 0], axis: 'x', val: i };
    ticks[count++] = { pos: [0, 0, i], axis: 'z', val: i };
  }

  // Y axis ticks
  const yCount = Math.floor(AXIS_Y_LENGTH);
  for (let i = -yCount; i <= yCount; i++) {
    if (i === 0 || !shouldLabel(i)) continue;
    ticks[count++] = { pos: [0, i, 0], axis: 'y', val: i };
  }

  // Trim to actual size
  ticks.length = count;

  return ticks;
}