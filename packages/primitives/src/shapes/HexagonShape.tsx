import React from 'react';
import { NodeProps } from '../types';

export function HexagonShape({ color = '#ef4444' }: Partial<NodeProps>) {
  return (
    <mesh>
      <cylinderGeometry args={[0.7, 0.7, 0.6, 6]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
    </mesh>
  );
}
