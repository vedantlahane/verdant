import React from 'react';
import { NodeProps } from '../types';

export function CapsuleShape({ color = '#14b8a6' }: Partial<NodeProps>) {
  return (
    <mesh>
      <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
    </mesh>
  );
}
