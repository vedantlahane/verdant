// grid/BlueprintGroundPlane.tsx

import React, { useEffect, useMemo } from 'react';
import { AXIS_LENGTH, AXIS_Y_LENGTH } from '../../constants';
import { useRendererStore } from '../../store';
import { detectDarkMode } from '../../utils';
import {
  createGridGeometries,
  disposeGridGeometries,
  computeTickData,
} from '../createGridGeometries';
import type { GridGeometries } from '../createGridGeometries';
import {
  createGridMaterials,
  disposeGridMaterials,
} from './createGridMaterials';
import type { GridMaterials } from './createGridMaterials';
import { AxisLabelSprite } from './AxisLabelSprite';
import type { TickData } from '../../types';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

/** Y-offset to prevent z-fighting between ground panel and grid lines */
const GROUND_PANEL_Y = 0.002;

/** Slight Y-offsets for layered elements */
const RING_Y = 0.005;
const ORIGIN_SPHERE_Y = 0.01;
const ARROW_Y = 0.03;
const ARROW_NEG_Y = 0.04;

/** Arrow tip sphere scale factor */
const ARROW_SPHERE_SCALE = 1.35;

// ── Frozen rotation tuples (avoids new array allocation every render) ──

const ROT_XZ_PANEL: readonly [number, number, number] = [-Math.PI / 2, 0, 0];
const ROT_YZ_PANEL: readonly [number, number, number] = [0, Math.PI / 2, 0];
const ROT_RING: readonly [number, number, number] = [-Math.PI / 2, 0, 0];
const ROT_ARROW_X: readonly [number, number, number] = [0, 0, -Math.PI / 2];
const ROT_ARROW_Y_NEG: readonly [number, number, number] = [Math.PI, 0, 0];
const ROT_ARROW_Z_POS: readonly [number, number, number] = [Math.PI / 2, 0, 0];
const ROT_ARROW_Z_NEG: readonly [number, number, number] = [-Math.PI / 2, 0, 0];

// ═══════════════════════════════════════════════════════════════════
//  Sub-components
//
//  Breaking the monolithic return into named sub-components:
//  - Reduces the main component's JSX from ~80 lines to ~20
//  - Each sub-component can be independently profiled in React DevTools
//  - Memoization prevents re-renders when unrelated state changes
// ═══════════════════════════════════════════════════════════════════

interface GridLayerProps {
  readonly geo: GridGeometries;
  readonly mat: GridMaterials;
}

// ── Grid Panels & Lines ──

const XZPlane = React.memo(function XZPlane({ geo, mat }: GridLayerProps) {
  return (
    <group>
      <mesh
        position-y={GROUND_PANEL_Y}
        rotation={ROT_XZ_PANEL}
        geometry={geo.xzPanel}
        material={mat.xzPanel}
        renderOrder={0}
      />
      <lineSegments geometry={geo.xzMinor} material={mat.xzMinor} renderOrder={1} />
      <lineSegments geometry={geo.xzMajor} material={mat.xzMajor} renderOrder={2} />
    </group>
  );
});

const YZPlane = React.memo(function YZPlane({ geo, mat }: GridLayerProps) {
  return (
    <group>
      <mesh
        rotation={ROT_YZ_PANEL}
        geometry={geo.yzPanel}
        material={mat.yzPanel}
        renderOrder={2}
      />
      <lineSegments geometry={geo.yzMinor} material={mat.yzMinor} renderOrder={3} />
      <lineSegments geometry={geo.yzMajor} material={mat.yzMajor} renderOrder={4} />
    </group>
  );
});

const XYPlane = React.memo(function XYPlane({ geo, mat }: GridLayerProps) {
  return (
    <group>
      <mesh
        geometry={geo.xyPanel}
        material={mat.xyPanel}
        renderOrder={4}
      />
      <lineSegments geometry={geo.xyMinor} material={mat.xyMinor} renderOrder={5} />
      <lineSegments geometry={geo.xyMajor} material={mat.xyMajor} renderOrder={6} />
    </group>
  );
});

// ── Axis Lines ──

const AxisLines = React.memo(function AxisLines({ geo, mat }: GridLayerProps) {
  return (
    <group>
      <lineSegments geometry={geo.xAxis} material={mat.xAxis} renderOrder={8} />
      <lineSegments geometry={geo.yAxis} material={mat.yAxis} renderOrder={8} />
      <lineSegments geometry={geo.zAxisPos} material={mat.zAxis} renderOrder={9} />
      <lineSegments geometry={geo.zAxisNeg} material={mat.zAxisNeg} renderOrder={10} />
    </group>
  );
});

// ── Origin Markers ──

const OriginMarkers = React.memo(function OriginMarkers({ geo, mat }: GridLayerProps) {
  return (
    <group>
      <lineSegments geometry={geo.crosshair} material={mat.crosshair} renderOrder={11} />
      <mesh
        position-y={RING_Y}
        rotation={ROT_RING}
        geometry={geo.ring}
        material={mat.ring}
        renderOrder={11}
      />
      <mesh
        position-y={ORIGIN_SPHERE_Y}
        geometry={geo.sphere}
        material={mat.sphere}
        renderOrder={11}
      />
    </group>
  );
});

// ── Axis Arrows ──

const AxisArrows = React.memo(function AxisArrows({ geo, mat }: GridLayerProps) {
  return (
    <group>
      {/* +X arrow */}
      <mesh
        position={[AXIS_LENGTH, ARROW_Y, 0]}
        rotation={ROT_ARROW_X}
        geometry={geo.arrow}
        material={mat.arrowX}
        renderOrder={12}
      />
      {/* +Y arrow */}
      <mesh
        position-y={AXIS_Y_LENGTH}
        geometry={geo.arrow}
        material={mat.arrowY}
        renderOrder={12}
      />
      {/* -Y arrow */}
      <mesh
        position-y={-AXIS_Y_LENGTH}
        rotation={ROT_ARROW_Y_NEG}
        geometry={geo.arrow}
        material={mat.arrowY}
        renderOrder={12}
      />
      {/* +Z arrow */}
      <mesh
        position={[0, ARROW_Y, AXIS_LENGTH]}
        rotation={ROT_ARROW_Z_POS}
        geometry={geo.arrow}
        material={mat.arrowZ}
        renderOrder={12}
      />
      {/* -Z arrow (cone) */}
      <mesh
        position={[0, ARROW_Y, -AXIS_LENGTH]}
        rotation={ROT_ARROW_Z_NEG}
        geometry={geo.arrow}
        material={mat.arrowZFar}
        renderOrder={13}
      />
      {/* -Z arrow (sphere accent) */}
      <mesh
        position={[0, ARROW_NEG_Y, -AXIS_LENGTH]}
        geometry={geo.sphere}
        scale={ARROW_SPHERE_SCALE}
        material={mat.arrowZFar}
        renderOrder={13}
      />
    </group>
  );
});

// ── Tick Marks ──

interface TickMarksProps {
  readonly ticks: readonly TickData[];
  readonly geo: GridGeometries;
  readonly mat: GridMaterials;
}

const TickMarks = React.memo(function TickMarks({ ticks, geo, mat }: TickMarksProps) {
  return (
    <group>
      {ticks.map((tick, i) => {
        const material =
          tick.axis === 'x' ? mat.tickX :
          tick.axis === 'y' ? mat.tickY :
          mat.tickZ;

        return (
          <mesh
            key={i}
            position={tick.pos}
            geometry={geo.tickBox}
            material={material}
          />
        );
      })}
    </group>
  );
});

// ── Tick Labels ──

interface TickLabelsProps {
  readonly ticks: readonly TickData[];
}

const TickLabels = React.memo(function TickLabels({ ticks }: TickLabelsProps) {
  return (
    <group>
      {ticks.map((tick, i) => (
        <AxisLabelSprite
          key={`${tick.axis}-${tick.val}-${i}`}
          tick={tick}
        />
      ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════

/**
 * Three-plane coordinate grid with axes, tick marks, labels, and
 * origin markers.
 *
 * Resource lifecycle:
 * - Geometries/materials are created once via `useMemo`
 * - Disposed via `useEffect` cleanup when dependencies change or unmount
 * - Dark mode detection is re-evaluated when theme colors change
 *
 * Performance:
 * - Sub-components are memoized — only re-render when geo/mat references change
 * - Rotation/position tuples are frozen module-level constants
 * - Tick data is computed once (pure function of grid constants)
 */
export const BlueprintGroundPlane = React.memo(function BlueprintGroundPlane() {
  const themeColors = useRendererStore((s) => s.themeColors);

  // Re-evaluate dark mode when theme changes
  // (themeColors reference changes → useMemo re-runs)
  const isDark = useMemo(() => detectDarkMode(), [themeColors]);

  // ── GPU Resources ──

  const geo = useMemo(() => createGridGeometries(), []);
  useEffect(() => () => disposeGridGeometries(geo), [geo]);

  const mat = useMemo(() => createGridMaterials(isDark), [isDark]);
  useEffect(() => () => disposeGridMaterials(mat), [mat]);

  // ── Static Data ──

  const ticks = useMemo(() => computeTickData(), []);

  return (
    <group>
      {/* Invisible raycast floor for endless double-click focal targeting */}
      <mesh position={[0, -GROUND_PANEL_Y - 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[10000, 10000]} />
      </mesh>
      <XZPlane geo={geo} mat={mat} />
      <YZPlane geo={geo} mat={mat} />
      <XYPlane geo={geo} mat={mat} />
      <AxisLines geo={geo} mat={mat} />
      <OriginMarkers geo={geo} mat={mat} />
      <AxisArrows geo={geo} mat={mat} />
      <TickMarks ticks={ticks} geo={geo} mat={mat} />
      <TickLabels ticks={ticks} />
    </group>
  );
});