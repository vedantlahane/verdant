import React from 'react';
import { NodeProps } from '../types';

export function DiamondShape({ color = '#f59e0b' }: Partial<NodeProps>) {
  return (
    <mesh rotation={[0, Math.PI / 4, 0]}>
      <octahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
    </mesh>
  );
}
