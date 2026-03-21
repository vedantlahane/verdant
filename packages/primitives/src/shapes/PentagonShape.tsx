import React from 'react';
import { NodeProps } from '../types';

export function PentagonShape({ color = '#10b981' }: Partial<NodeProps>) {
  return (
    <mesh>
      <cylinderGeometry args={[0.7, 0.7, 0.1, 5]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
    </mesh>
  );
}
