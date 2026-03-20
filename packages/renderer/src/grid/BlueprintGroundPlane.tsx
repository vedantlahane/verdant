// BlueprintGroundPlane.tsx

import React, { useEffect, useMemo } from 'react';
import { GRID_SIZE, AXIS_LENGTH, AXIS_Y_LENGTH } from '../constants';
import { useRendererStore } from '../store';
import { detectDarkMode } from '../utils';
import {
  createGridGeometries,
  disposeGridGeometries,
  computeTickData,
} from './createGridGeometries';
import {
  createGridMaterials,
  disposeGridMaterials,
} from './createGridMaterials';
import { AxisLabelSprite } from './AxisLabelSprite';

export function BlueprintGroundPlane() {
  const themeColors = useRendererStore((s) => s.themeColors);

  const isDark = useMemo(() => detectDarkMode(), [themeColors]);

  const geo = useMemo(() => createGridGeometries(), []);
  useEffect(() => () => disposeGridGeometries(geo), [geo]);

  const mat = useMemo(() => createGridMaterials(isDark), [isDark]);
  useEffect(() => () => disposeGridMaterials(mat), [mat]);

  const ticks = useMemo(() => computeTickData(), []);

  return (
    <group>
      {/* ── XZ plane (ground) ── */}
      <mesh
        position={[0, 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={geo.xzPanel}
        material={mat.xzPanel}
        renderOrder={0}
      />
      <lineSegments geometry={geo.xzMinor} material={mat.xzMinor} renderOrder={1} />
      <lineSegments geometry={geo.xzMajor} material={mat.xzMajor} renderOrder={2} />

      {/* ── YZ plane ── */}
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        geometry={geo.yzPanel}
        material={mat.yzPanel}
        renderOrder={2}
      />
      <lineSegments geometry={geo.yzMinor} material={mat.yzMinor} renderOrder={3} />
      <lineSegments geometry={geo.yzMajor} material={mat.yzMajor} renderOrder={4} />

      {/* ── XY plane ── */}
      <mesh geometry={geo.xyPanel} material={mat.xyPanel} renderOrder={4} />
      <lineSegments geometry={geo.xyMinor} material={mat.xyMinor} renderOrder={5} />
      <lineSegments geometry={geo.xyMajor} material={mat.xyMajor} renderOrder={6} />

      {/* ── Axes ── */}
      <lineSegments geometry={geo.xAxis} material={mat.xAxis} renderOrder={8} />
      <lineSegments geometry={geo.yAxis} material={mat.yAxis} renderOrder={8} />
      <lineSegments geometry={geo.zAxisPos} material={mat.zAxis} renderOrder={9} />
      <lineSegments geometry={geo.zAxisNeg} material={mat.zAxisNeg} renderOrder={10} />

      {/* ── Origin ── */}
      <lineSegments geometry={geo.crosshair} material={mat.crosshair} renderOrder={11} />
      <mesh
        position={[0, 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={geo.ring}
        material={mat.ring}
        renderOrder={11}
      />
      <mesh position={[0, 0.01, 0]} geometry={geo.sphere} material={mat.sphere} renderOrder={11} />

      {/* ── Tick marks ── */}
      {ticks.map((tick, i) => (
        <mesh
          key={i}
          position={tick.pos}
          geometry={geo.tickBox}
          material={
            tick.axis === 'x' ? mat.tickX : tick.axis === 'y' ? mat.tickY : mat.tickZ
          }
        />
      ))}

      {/* ── Axis arrows ── */}
      <mesh
        position={[AXIS_LENGTH, 0.03, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        geometry={geo.arrow}
        material={mat.arrowX}
        renderOrder={12}
      />
      <mesh position={[0, AXIS_Y_LENGTH, 0]} geometry={geo.arrow} material={mat.arrowY} renderOrder={12} />
      <mesh
        position={[0, -AXIS_Y_LENGTH, 0]}
        rotation={[Math.PI, 0, 0]}
        geometry={geo.arrow}
        material={mat.arrowY}
        renderOrder={12}
      />
      <mesh
        position={[0, 0.03, AXIS_LENGTH]}
        rotation={[Math.PI / 2, 0, 0]}
        geometry={geo.arrow}
        material={mat.arrowZ}
        renderOrder={12}
      />
      <mesh
        position={[0, 0.03, -AXIS_LENGTH]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={geo.arrow}
        material={mat.arrowZFar}
        renderOrder={13}
      />
      <mesh
        position={[0, 0.04, -AXIS_LENGTH]}
        geometry={geo.sphere}
        scale={[1.35, 1.35, 1.35]}
        material={mat.arrowZFar}
        renderOrder={13}
      />

      {/* ── Axis labels ── */}
      {ticks.map((t, i) => (
        <AxisLabelSprite key={`${t.axis}-${t.val}-${i}`} tick={t} />
      ))}
    </group>
  );
}