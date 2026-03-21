import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface InstancedNode {
  id: string;
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  color?: string;
}

interface InstancedRendererProps {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  nodes: InstancedNode[];
}

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _color = new THREE.Color();

/**
 * Consolidates 10+ same-shape nodes into a single InstancedMesh draw call.
 * Returns null if fewer than 10 nodes are provided (caller should use
 * individual meshes instead).
 */
export function InstancedRenderer({
  geometry,
  material,
  nodes,
}: InstancedRendererProps): JSX.Element | null {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let hasColor = false;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      _position.copy(node.position);
      _quaternion.identity();
      if (node.rotation) {
        _quaternion.setFromEuler(node.rotation);
      }
      _scale.set(1, 1, 1);
      if (node.scale) {
        _scale.copy(node.scale);
      }

      _matrix.compose(_position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);

      if (node.color) {
        _color.set(node.color);
        mesh.setColorAt(i, _color);
        hasColor = true;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (hasColor && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [nodes]);

  if (nodes.length < 10) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, nodes.length]}
    />
  );
}
