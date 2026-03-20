import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function CloudNode(props: NodeProps) {
  const { color = '#93c5fd' } = props;

  return (
    <BaseNode {...props}>
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
      </mesh>
    </BaseNode>
  );
}
