import React from 'react';
import { NodeProps } from '../types';

export function RingShape({ color = '#a78bfa' }: Partial<NodeProps>) {
  return (
    <mesh>
      <torusGeometry args={[0.5, 0.08, 16, 100]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
    </mesh>
  );
}
