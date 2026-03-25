// primitives/src/edges/FlowParticles.tsx

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import type { SharedGeometryPool } from '../geometry/SharedGeometryPool';
import type { MaterialCache } from '../materials/MaterialCache';

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

/**
 * Computes the world-space position at parameter `t ∈ [0, 1]` along a polyline path.
 * Writes into `out` to avoid allocation.
 */
function samplePath(
  path: Vector3[],
  t: number,
  out: Vector3,
): void {
  const len = path.length;
  if (len === 0) { out.set(0, 0, 0); return; }
  if (len === 1) { out.copy(path[0]); return; }

  // Compute total length
  let totalLength = 0;
  for (let i = 1; i < len; i++) {
    totalLength += path[i].distanceTo(path[i - 1]);
  }
  if (totalLength === 0) { out.copy(path[0]); return; }

  // Walk segments to find the target position
  const target = Math.max(0, Math.min(1, t)) * totalLength;
  let accumulated = 0;

  for (let i = 1; i < len; i++) {
    const segLen = path[i].distanceTo(path[i - 1]);
    if (accumulated + segLen >= target) {
      const localT = segLen === 0 ? 0 : (target - accumulated) / segLen;
      out.lerpVectors(path[i - 1], path[i], localT);
      return;
    }
    accumulated += segLen;
  }

  out.copy(path[len - 1]);
}

export function FlowParticles({
  path,
  count = 5,
  speed = 2.0,
  color = '#52B788',
  size = 0.06,
  geometryPool,
  materialCache,
}: FlowParticlesProps) {
  // ── Shared geometry for all particles in this edge ──
  const geometry = useMemo(() => {
    const key = `flow-particle:${size}`;
    if (geometryPool) {
      return geometryPool.acquire(key, () => new SphereGeometry(size, 6, 6));
    }
    return new SphereGeometry(size, 6, 6);
  }, [size, geometryPool]);

  // ── Shared material for all particles in this edge ──
  const material = useMemo(() => {
    const config = { type: 'MeshBasicMaterial' as const, color, transparent: true, opacity: 0.9 };
    if (materialCache) {
      return materialCache.acquire(config);
    }
    return new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  }, [color, materialCache]);

  // ── Phase offsets — evenly distributed ──
  const tValues = useRef<Float32Array>(new Float32Array(count));

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

  // ── Cleanup on unmount ──
  useEffect(() => {
    const geoKey = `flow-particle:${size}`;
    const matConfig = { type: 'MeshBasicMaterial' as const, color, transparent: true, opacity: 0.9 };

    return () => {
      if (geometryPool) {
        geometryPool.release(geoKey);
      } else {
        geometry.dispose();
      }
      if (materialCache) {
        materialCache.release(matConfig);
      } else {
        material.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, color, geometryPool, materialCache]);

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
        samplePath(path, ts[i], _tempPos);
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