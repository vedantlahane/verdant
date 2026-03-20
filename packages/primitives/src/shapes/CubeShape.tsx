import React from 'react';
import { NodeProps } from '../types';

export function CubeShape({ color = '#4287f5' }: Partial<NodeProps>) {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
    </mesh>
  );
}
