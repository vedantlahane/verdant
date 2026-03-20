// DimensionLine.tsx

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MeasurementLine } from '../types';
import { DASH_SIZE, GAP_SIZE, WING_HALF_WIDTH } from '../constants';

interface DimensionLineProps extends MeasurementLine {
  accentColor: string;
}

export function DimensionLine({
  from,
  to,
  label,
  direction,
  accentColor,
}: DimensionLineProps) {
  const lineColor = direction === 'outgoing' ? accentColor : '#e57373';

  // ── Stable key for memo (arrays are new refs each render) ──
  const fromKey = `${from[0]},${from[1]},${from[2]}`;
  const toKey = `${to[0]},${to[1]},${to[2]}`;

  // ── Line geometry ──
  const { lineGeo, lineMat } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([...from, ...to], 3),
    );

    const tmpLine = new THREE.Line(geo);
    tmpLine.computeLineDistances();
    const finalGeo = tmpLine.geometry;

    const mat = new THREE.LineDashedMaterial({
      color: lineColor,
      dashSize: DASH_SIZE,
      gapSize: GAP_SIZE,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    return { lineGeo: finalGeo, lineMat: mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey, lineColor]);

  useEffect(() => () => { lineGeo.dispose(); lineMat.dispose(); }, [lineGeo, lineMat]);

  // ── Wing geometry ──
  const { wingGeo, wingMat } = useMemo(() => {
    const dir = new THREE.Vector3(
      to[0] - from[0],
      to[1] - from[1],
      to[2] - from[2],
    ).normalize();

       const up = new THREE.Vector3(0, 1, 0);
    let perp = new THREE.Vector3().crossVectors(dir, up);
    if (perp.lengthSq() < 0.001) {
      perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
    }
    perp.normalize();

    const W = WING_HALF_WIDTH;
    const verts: number[] = [
      // Wing at "from"
      from[0] + perp.x * W, from[1] + perp.y * W, from[2] + perp.z * W,
      from[0] - perp.x * W, from[1] - perp.y * W, from[2] - perp.z * W,
      // Wing at "to"
      to[0] + perp.x * W, to[1] + perp.y * W, to[2] + perp.z * W,
      to[0] - perp.x * W, to[1] - perp.y * W, to[2] - perp.z * W,
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

    const mat = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    return { wingGeo: geo, wingMat: mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey, lineColor]);

  useEffect(() => () => { wingGeo.dispose(); wingMat.dispose(); }, [wingGeo, wingMat]);

  // ── Distance ──
  const distance = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey]);

  // ── Label position ──
  const labelPos = useMemo<[number, number, number]>(
    () => [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 0.35,
      (from[2] + to[2]) / 2,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fromKey, toKey],
  );

  // ── Animate opacity — early exit after complete ──
  const opacityRef = useRef(0);
  const animDone = useRef(false);
  const labelDivRef = useRef<HTMLDivElement>(null);

  // Reset animation when geometry changes
  useEffect(() => {
    opacityRef.current = 0;
    animDone.current = false;
  }, [fromKey, toKey]);

  useFrame((_, delta) => {
    if (animDone.current) return;

    opacityRef.current = Math.min(1, opacityRef.current + delta * 4);
    const o = opacityRef.current;

    lineMat.opacity = o * 0.55;
    wingMat.opacity = o * 0.45;

    if (labelDivRef.current) {
      labelDivRef.current.style.opacity = String(o);
    }

    if (o >= 1) animDone.current = true;
  });

  return (
    <group>
      <lineSegments geometry={lineGeo} material={lineMat} />
      <lineSegments geometry={wingGeo} material={wingMat} />
      <Html
        position={labelPos}
        center
        distanceFactor={18}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          ref={labelDivRef}
          style={{
            opacity: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.12em',
            color: lineColor,
            background: 'color-mix(in srgb, var(--page-bg) 85%, transparent)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            padding: '2px 6px',
            borderRadius: '1px',
            border: `1px solid color-mix(in srgb, ${lineColor} 25%, transparent)`,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ opacity: 0.5 }}>
            {direction === 'outgoing' ? '→' : '←'}
          </span>
          <span>{distance.toFixed(1)}u</span>
          {label && (
            <span style={{ opacity: 0.6, marginLeft: '2px' }}>
              &quot;{label}&quot;
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}