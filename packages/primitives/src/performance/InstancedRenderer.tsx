// primitives/src/performance/InstancedRenderer.tsx

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Pre-allocated ──
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _color = new THREE.Color();

// ── Types ───────────────────────────────────────────────────

export interface InstanceData {
  id: string;
  position: [number, number, number];
  color?: string;
  scale?: number;
  selected?: boolean;
}

export interface InstancedRendererProps {
  /** Shared geometry for all instances. */
  geometry: THREE.BufferGeometry;
  /** Base material (color is overridden per instance). */
  material?: THREE.Material;
  /** Instance data array. */
  instances: InstanceData[];
  /** Default color for instances without a color property. @default "#4287f5" */
  defaultColor?: string;
  /** Whether to update instance matrices every frame (for animated nodes). @default false */
  animated?: boolean;
}

/**
 * Consolidates multiple same-shape nodes into a single `InstancedMesh` draw call.
 *
 * **When to use:** 10+ nodes with the same shape and material type.
 * **Performance:** 100 cubes = 1 draw call instead of 100.
 *
 * @example
 * ```tsx
 * <InstancedRenderer
 *   geometry={SharedGeometry.box}
 *   instances={cubeNodes.map(n => ({
 *     id: n.id,
 *     position: n.position,
 *     color: n.color,
 *     selected: selectedIds.has(n.id),
 *   }))}
 * />
 * ```
 */
export function InstancedRenderer({
  geometry,
  material,
  instances,
  defaultColor = '#4287f5',
  animated = false,
}: InstancedRendererProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = instances.length;

  // ── Default material ──
  const defaultMaterial = useMemo(
    () =>
      material ??
      new THREE.MeshStandardMaterial({
        metalness: 0.2,
        roughness: 0.6,
      }),
    [material],
  );

  // ── Update instance matrices and colors ──
  const updateInstances = () => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    for (let i = 0; i < count; i++) {
      const inst = instances[i];

      _position.set(inst.position[0], inst.position[1], inst.position[2]);
      const s = inst.scale ?? 1;
      _scale.set(s, s, s);

      // Selected nodes get a slight scale bump
      if (inst.selected) {
        _scale.multiplyScalar(1.08);
      }

      _matrix.compose(_position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);

      // Per-instance color
      if (inst.selected) {
        _color.set('#fbbf24');
      } else {
        _color.set(inst.color ?? defaultColor);
      }
      mesh.setColorAt(i, _color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  // ── Initial update ──
  useEffect(() => {
    updateInstances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances, count, defaultColor]);

  // ── Per-frame update for animated instances ──
  useFrame(() => {
    if (animated) {
      updateInstances();
    }
  });

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, defaultMaterial, count]}
      frustumCulled={false}
    />
  );
}