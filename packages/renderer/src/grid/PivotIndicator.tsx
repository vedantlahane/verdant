// grid/PivotIndicator.tsx

import React, { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, LineDashedMaterial, MeshBasicMaterial, SphereGeometry } from 'three';
import { Html } from '@react-three/drei';
import { detectDarkMode } from '../utils';
import { useRendererStore } from '../store';
import type { Vec3 } from '../types';
import {
  AXIS_COLOR_X,
  AXIS_COLOR_Y,
  AXIS_COLOR_Z,
  PIVOT_AXIS_LENGTH,
  PIVOT_AXIS_OPACITY,
  PIVOT_REFERENCE_OPACITY,
  PIVOT_DASH_SIZE,
  PIVOT_GAP_SIZE,
  REFERENCE_BOX_MIN_DIM,
  REFERENCE_LABEL_FONT_SIZE,
} from '../constants';

// ═══════════════════════════════════════════════════════════════════
//  Materials (module-level singletons)
// ═══════════════════════════════════════════════════════════════════

const LOCAL_MAT_X = new LineBasicMaterial({ color: AXIS_COLOR_X, opacity: PIVOT_AXIS_OPACITY, transparent: true, depthWrite: false });
const LOCAL_MAT_Y = new LineBasicMaterial({ color: AXIS_COLOR_Y, opacity: PIVOT_AXIS_OPACITY, transparent: true, depthWrite: false });
const LOCAL_MAT_Z = new LineBasicMaterial({ color: AXIS_COLOR_Z, opacity: PIVOT_AXIS_OPACITY, transparent: true, depthWrite: false });

const CENTER_GEO = new SphereGeometry(0.05, 8, 8);
const CENTER_MAT = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 });

function createRefMaterial(color: string): LineDashedMaterial {
  return new LineDashedMaterial({
    color,
    opacity: PIVOT_REFERENCE_OPACITY,
    transparent: true,
    depthWrite: false,
    dashSize: PIVOT_DASH_SIZE,
    gapSize: PIVOT_GAP_SIZE,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Geometry Builders
// ═══════════════════════════════════════════════════════════════════

function createLocalAxes(px: number, py: number, pz: number, len: number) {
  const half = len;
  const makeGeo = (verts: number[]) => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(verts, 3));
    return geo;
  };

  return {
    x: makeGeo([px - half, py, pz, px + half, py, pz]),
    y: makeGeo([px, py - half, pz, px, py + half, pz]),
    z: makeGeo([px, py, pz - half, px, py, pz + half]),
  };
}

function createReferenceLines(px: number, py: number, pz: number) {
  const makeGeo = (verts: number[]) => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(verts, 3));

    // Compute line distances here (once per geometry)
    const tmpLine = new Line(geo);
    tmpLine.computeLineDistances();

    return geo;
  };

  return {
    toX: makeGeo([px, py, pz, px, 0, pz]),
    toY: makeGeo([px, py, pz, 0, py, pz]),
    toZ: makeGeo([px, py, pz, px, py, 0]),
  };
}

const REF_MAT_X = createRefMaterial(AXIS_COLOR_X);
const REF_MAT_Y = createRefMaterial(AXIS_COLOR_Y);
const REF_MAT_Z = createRefMaterial(AXIS_COLOR_Z);

// ═══════════════════════════════════════════════════════════════════
//  PivotIndicator Component
// ═══════════════════════════════════════════════════════════════════

/**
 * Indicator at the orbit target (pivot point).
 * Shows:
 * - Local XYZ axes in world colors
 * - A small white sphere at the center
 * - Dashed reference lines connecting pivot to world axes
 * - Coordinate label with exact position
 */
export interface PivotIndicatorProps {
  target: Vec3;
}
    
export const PivotIndicator = React.memo(function PivotIndicator({ target: pivot }: PivotIndicatorProps) {
  // Compute geometries when pivot changes
  const { localAxesGeos, refLinesGeos } = useMemo(() => {
    const px = pivot[0];
    const py = pivot[1];
    const pz = pivot[2];
    return {
      localAxesGeos: createLocalAxes(px, py, pz, PIVOT_AXIS_LENGTH),
      refLinesGeos: createReferenceLines(px, py, pz),
    };
  }, [pivot]);

  // Dispose geometries on change / unmount
  useEffect(() => {
    return () => {
      localAxesGeos.x.dispose();
      localAxesGeos.y.dispose();
      localAxesGeos.z.dispose();
      refLinesGeos.toX.dispose();
      refLinesGeos.toY.dispose();
      refLinesGeos.toZ.dispose();
    };
  }, [localAxesGeos, refLinesGeos]);

  const themeColors = useRendererStore((s) => s.themeColors);
  const isDark = useMemo(() => detectDarkMode(), [themeColors]);

  return (
    <group>
      {/* Local axes at pivot (XYZ in local colors) */}
      <group>
        <lineSegments geometry={localAxesGeos.x} material={LOCAL_MAT_X} />
        <lineSegments geometry={localAxesGeos.y} material={LOCAL_MAT_Y} />
        <lineSegments geometry={localAxesGeos.z} material={LOCAL_MAT_Z} />
      </group>

      {/* Center sphere at pivot */}
      <mesh position={pivot} geometry={CENTER_GEO} material={CENTER_MAT} />

      {/* Reference lines from pivot to world axes */}
      <group>
        <lineSegments geometry={refLinesGeos.toX} material={REF_MAT_X} />
        <lineSegments geometry={refLinesGeos.toY} material={REF_MAT_Y} />
        <lineSegments geometry={refLinesGeos.toZ} material={REF_MAT_Z} />
      </group>

      {/* Coordinate labels at pivot */}
      <Html
        position={pivot}
        scale={1}
        distanceFactor={1}
        occlude="blending"
      >
        <div
          style={{
            fontSize: REFERENCE_LABEL_FONT_SIZE,
            color: isDark ? '#aaa' : '#444',
            fontFamily: 'monospace',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            textShadow: isDark
              ? '0 0 4px rgba(0,0,0,0.8)'
              : '0 0 4px rgba(255,255,255,0.8)',
            pointerEvents: 'none',
            marginLeft: '8px',
            marginTop: '-8px',
          }}
        >
          {`(${pivot[0].toFixed(1)}, ${pivot[1].toFixed(1)}, ${pivot[2].toFixed(1)})`}
        </div>
      </Html>
    </group>
  );
});