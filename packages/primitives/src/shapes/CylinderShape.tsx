import React from 'react';
import { NodeProps } from '../types';

export function CylinderShape({ color = '#42f554' }: Partial<NodeProps>) {
  return (
    <mesh>
      <cylinderGeometry args={[0.5, 0.5, 1, 24]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.7} />
    </mesh>
  );
}
