// createGridGeometries.ts

import * as THREE from 'three';
import {
  GRID_SIZE,
  AXIS_Y_LENGTH,
  AXIS_LENGTH,
  MAJOR_STEP,
  MINOR_STEP,
  TICK_SIZE,
} from '../constants';
import { TickData } from '../types';

function makeLineGeo(points: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geo;
}

export interface GridGeometries {
  // Axes
  xAxis: THREE.BufferGeometry;
  yAxis: THREE.BufferGeometry;
  zAxisPos: THREE.BufferGeometry;
  zAxisNeg: THREE.BufferGeometry;

  // XZ plane
  xzMinor: THREE.BufferGeometry;
  xzMajor: THREE.BufferGeometry;

  // YZ plane
  yzMinor: THREE.BufferGeometry;
  yzMajor: THREE.BufferGeometry;

  // XY plane
  xyMinor: THREE.BufferGeometry;
  xyMajor: THREE.BufferGeometry;

  // Panels
  xzPanel: THREE.PlaneGeometry;
  yzPanel: THREE.PlaneGeometry;
  xyPanel: THREE.PlaneGeometry;

  // Origin
  crosshair: THREE.BufferGeometry;
  ring: THREE.RingGeometry;
  sphere: THREE.SphereGeometry;

  // Ticks
  tickBox: THREE.BoxGeometry;

  // Arrows
  arrow: THREE.ConeGeometry;
}

function buildMinorGrid(plane: 'xz' | 'yz' | 'xy'): THREE.BufferGeometry {
  const v: number[] = [];
  for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MINOR_STEP) {
    if (i % MAJOR_STEP === 0 || i === 0) continue;
    switch (plane) {
      case 'xz':
        v.push(i, 0, -GRID_SIZE, i, 0, GRID_SIZE);
        v.push(-GRID_SIZE, 0, i, GRID_SIZE, 0, i);
        break;
      case 'yz':
        v.push(0, i, -GRID_SIZE, 0, i, GRID_SIZE);
        v.push(0, -GRID_SIZE, i, 0, GRID_SIZE, i);
        break;
      case 'xy':
        v.push(-GRID_SIZE, i, 0, GRID_SIZE, i, 0);
        v.push(i, -GRID_SIZE, 0, i, GRID_SIZE, 0);
        break;
    }
  }
  return makeLineGeo(v);
}

function buildMajorGrid(plane: 'xz' | 'yz' | 'xy'): THREE.BufferGeometry {
  const v: number[] = [];
  for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MAJOR_STEP) {
    if (i === 0) continue;
    switch (plane) {
      case 'xz':
        v.push(i, 0, -GRID_SIZE, i, 0, GRID_SIZE);
        v.push(-GRID_SIZE, 0, i, GRID_SIZE, 0, i);
        break;
      case 'yz':
        v.push(0, i, -GRID_SIZE, 0, i, GRID_SIZE);
        v.push(0, -GRID_SIZE, i, 0, GRID_SIZE, i);
        break;
      case 'xy':
        v.push(-GRID_SIZE, i, 0, GRID_SIZE, i, 0);
        v.push(i, -GRID_SIZE, 0, i, GRID_SIZE, 0);
        break;
    }
  }
  return makeLineGeo(v);
}

export function createGridGeometries(): GridGeometries {
  const s = GRID_SIZE * 2;
  return {
    xAxis: makeLineGeo([-AXIS_LENGTH, 0.015, 0, AXIS_LENGTH, 0.015, 0]),
    yAxis: makeLineGeo([0, -AXIS_Y_LENGTH, 0, 0, AXIS_Y_LENGTH, 0]),
    zAxisPos: makeLineGeo([0, 0.03, 0, 0, 0.03, AXIS_LENGTH]),
    zAxisNeg: makeLineGeo([0, 0.03, -AXIS_LENGTH, 0, 0.03, 0]),

    xzMinor: buildMinorGrid('xz'),
    xzMajor: buildMajorGrid('xz'),
    yzMinor: buildMinorGrid('yz'),
    yzMajor: buildMajorGrid('yz'),
    xyMinor: buildMinorGrid('xy'),
    xyMajor: buildMajorGrid('xy'),

    xzPanel: new THREE.PlaneGeometry(s, s),
    yzPanel: new THREE.PlaneGeometry(s, s),
    xyPanel: new THREE.PlaneGeometry(s, s),

    crosshair: makeLineGeo([-0.5, 0.005, 0, 0.5, 0.005, 0, 0, 0.005, -0.5, 0, 0.005, 0.5]),
    ring: new THREE.RingGeometry(0.35, 0.4, 32),
    sphere: new THREE.SphereGeometry(0.06, 12, 12),

    tickBox: new THREE.BoxGeometry(TICK_SIZE, TICK_SIZE, TICK_SIZE),
    arrow: new THREE.ConeGeometry(0.12, 0.4, 8),
  };
}

export function disposeGridGeometries(g: GridGeometries): void {
  for (const value of Object.values(g)) {
    if (value && typeof value.dispose === 'function') {
      value.dispose();
    }
  }
}

// ── Tick data ──

export function computeTickData(): TickData[] {
  const ticks: TickData[] = [];
  ticks.push({ pos: [0, 0, 0], axis: 'x', val: 0 });

  const shouldLabel = (v: number): boolean => {
    if (v === 0) return true;
    return (Math.abs(v) - 1) % 4 === 0;
  };

  const count = Math.floor(AXIS_LENGTH);
  for (let i = -count; i <= count; i++) {
    if (i === 0) continue;
    if (!shouldLabel(i)) continue;
    ticks.push({ pos: [i, 0, 0], axis: 'x', val: i });
    ticks.push({ pos: [0, 0, i], axis: 'z', val: i });
  }

  const yCount = Math.floor(AXIS_Y_LENGTH);
  for (let i = -yCount; i <= yCount; i++) {
    if (i === 0) continue;
    if (!shouldLabel(i)) continue;
    ticks.push({ pos: [0, i, 0], axis: 'y', val: i });
  }

  return ticks;
}