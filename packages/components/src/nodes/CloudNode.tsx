// packages/components/src/nodes/CloudNode.tsx

import React from 'react';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function CloudNode(props: NodeProps) {
  const { color = '#38bdf8' } = props;

  return (
    <BaseNodeWrapper {...props}>
      {/* Cloud = cluster of spheres */}
      {/* Center body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.1}
          roughness={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Left bump */}
      <mesh position={[-0.4, -0.1, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.1}
          roughness={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Right bump */}
      <mesh position={[0.4, -0.05, 0]}>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.1}
          roughness={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Top bump */}
      <mesh position={[0.15, 0.3, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.1}
          roughness={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
    </BaseNodeWrapper>
  );
}