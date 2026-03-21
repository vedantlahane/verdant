import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SharedGeometryPool } from '../geometry/SharedGeometryPool';
import type { MaterialCache } from '../materials/MaterialCache';

export interface FlowParticlesProps {
  path: THREE.Vector3[];
  count?: number;
  speed?: number;
  color?: string;
  geometryPool?: SharedGeometryPool;
  materialCache?: MaterialCache;
}

const GEOMETRY_KEY = 'flow-particle:0.06:6:6';

function getPointAtT(path: THREE.Vector3[], t: number): THREE.Vector3 {
  if (path.length === 0) return new THREE.Vector3();
  if (path.length === 1) return path[0].clone();

  // Compute total length
  let totalLength = 0;
  const segLengths: number[] = [];
  for (let i = 1; i < path.length; i++) {
    const len = path[i].distanceTo(path[i - 1]);
    segLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) return path[0].clone();

  const target = t * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (accumulated + segLen >= target) {
      const localT = segLen === 0 ? 0 : (target - accumulated) / segLen;
      return new THREE.Vector3().lerpVectors(path[i], path[i + 1], localT);
    }
    accumulated += segLen;
  }

  return path[path.length - 1].clone();
}

export function FlowParticles({
  path,
  count = 5,
  speed = 2.0,
  color = '#52B788',
  geometryPool,
  materialCache,
}: FlowParticlesProps) {
  const tValues = useRef<number[]>(
    Array.from({ length: count }, (_, i) => i / count)
  );

  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(count).fill(null));

  // Cleanup on unmount
  useEffect(() => {
    const resolvedColor = color;
    return () => {
      if (geometryPool) {
        for (let i = 0; i < count; i++) {
          geometryPool.release(GEOMETRY_KEY);
        }
      }
      if (materialCache) {
        for (let i = 0; i < count; i++) {
          materialCache.release({ color: resolvedColor });
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, deltaTime) => {
    const ts = tValues.current;
    for (let i = 0; i < count; i++) {
      ts[i] = (ts[i] + deltaTime / speed) % 1.0;
      const mesh = meshRefs.current[i];
      if (mesh && path.length >= 2) {
        const pos = getPointAtT(path, ts[i]);
        mesh.position.set(pos.x, pos.y, pos.z);
      }
    }
  });

  if (path.length < 2) return null;

  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const initPos = getPointAtT(path, tValues.current[i]);
        return (
          <mesh
            key={i}
            ref={(el) => { meshRefs.current[i] = el; }}
            position={[initPos.x, initPos.y, initPos.z]}
          >
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}
