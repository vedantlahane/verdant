import React from 'react';
import { NodeProps } from '../types';

export function SphereShape({ color = '#8b5cf6' }: Partial<NodeProps>) {
  return (
    <mesh>
      <sphereGeometry args={[0.7, 32, 32]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
    </mesh>
  );
}
