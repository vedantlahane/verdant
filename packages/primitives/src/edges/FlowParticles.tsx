// primitives/src/edges/FlowParticles.tsx

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { SharedGeometryPool } from '../geometry/SharedGeometryPool';
import type { MaterialCache } from '../materials/MaterialCache';
import { samplePathAtT } from './pathUtils';

export interface FlowParticlesProps {
  /** Path points the particles travel along. Must have ≥ 2 points. */
  path: Vector3[];
  /** Number of simultaneous particles. @default 5 */
  count?: number;
  /** Seconds for one full traversal. @default 2.0 */
  speed?: number;
  /** Particle color. @default "#52B788" */
  color?: string;
  /** Particle sphere radius. @default 0.06 */
  size?: number;
  /** Optional shared geometry pool for lifecycle management. */
  geometryPool?: SharedGeometryPool;
  /** Optional shared material cache for lifecycle management. */
  materialCache?: MaterialCache;
}

// ── Pre-allocated temp vector for position calculations ──
const _tempPos = new Vector3();

export function FlowParticles({
  path,
  count = 5,
  speed = 2.0,
  color = '#52B788',
  size = 0.06,
  geometryPool,
  materialCache,
}: FlowParticlesProps) {
  // ── Phase offsets — evenly distributed ──
  const tValues = useRef<Float32Array>(new Float32Array(count));

  // ── Consolidated resource keys ──
  const resourceKeys = useMemo(() => ({
    geoKey: `flow-particle:${size}`,
    matConfig: {
      type: 'MeshBasicMaterial' as const,
      color,
      transparent: true,
      opacity: 0.9,
    },
  }), [size, color]);

  // ── Shared geometry for all particles in this edge ──
  const geometry = useMemo(() => {
    if (geometryPool) {
      return geometryPool.acquire(resourceKeys.geoKey, () => new SphereGeometry(size, 6, 6));
    }
    return new SphereGeometry(size, 6, 6);
  }, [size, geometryPool, resourceKeys.geoKey]);

  // ── Shared material for all particles in this edge ──
  const material = useMemo(() => {
    if (materialCache) {
      return materialCache.acquire(resourceKeys.matConfig);
    }
    return new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  }, [color, materialCache, resourceKeys.matConfig]);

  // Reset t-values when count changes
  useEffect(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = i / count;
    }
    tValues.current = arr;
  }, [count]);

  // ── Mesh refs ──
  const meshRefs = useRef<(Mesh | null)[]>([]);

  // Ensure refs array matches count
  useEffect(() => {
    meshRefs.current = new Array(count).fill(null);
  }, [count]);

  // ── Single cleanup effect using consolidated resource keys ──
  useEffect(() => {
    const { geoKey, matConfig } = resourceKeys;
    const geoPool = geometryPool;
    const matPool = materialCache;
    const geo = geometry;
    const mat = material;

    return () => {
      if (geoPool) {
        geoPool.release(geoKey);
      } else {
        geo.dispose();
      }
      if (matPool) {
        matPool.release(matConfig);
      } else {
        mat.dispose();
      }
    };
  }, [resourceKeys, geometryPool, materialCache, geometry, material]);

  // ── Animation loop ──
  useFrame((_, delta) => {
    if (path.length < 2) return;

    const ts = tValues.current;
    const dt = delta / Math.max(0.01, speed);

    for (let i = 0; i < count; i++) {
      // Advance parameter
      ts[i] = (ts[i] + dt) % 1.0;

      // Update mesh position
      const mesh = meshRefs.current[i];
      if (mesh) {
        samplePathAtT(path, ts[i], _tempPos);
        mesh.position.copy(_tempPos);
      }
    }
  });

  // Don't render if path is too short
  if (path.length < 2) return null;

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          geometry={geometry}
          material={material}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}