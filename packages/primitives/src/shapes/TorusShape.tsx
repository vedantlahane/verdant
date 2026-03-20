import React from 'react';
import { NodeProps } from '../types';

export function TorusShape({ color = '#06b6d4' }: Partial<NodeProps>) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.5, 0.2, 16, 100]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
    </mesh>
  );
}
