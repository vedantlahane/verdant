import React from 'react';
import { NodeProps } from '../types';

export function PlaneShape({ color = '#94a3b8' }: Partial<NodeProps>) {
  return (
    <mesh>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color={color} metalness={0.1} roughness={0.8} side={2} />
    </mesh>
  );
}
