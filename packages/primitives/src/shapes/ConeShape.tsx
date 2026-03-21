import React from 'react';
import { NodeProps } from '../types';

export function ConeShape({ color = '#ec4899' }: Partial<NodeProps>) {
  return (
    <mesh>
      <coneGeometry args={[0.5, 1, 32]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
    </mesh>
  );
}
