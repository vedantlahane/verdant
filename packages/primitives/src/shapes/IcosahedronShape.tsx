import React from 'react';
import { NodeProps } from '../types';

export function IcosahedronShape({ color = '#6366f1' }: Partial<NodeProps>) {
  return (
    <mesh>
      <icosahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
    </mesh>
  );
}
