import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function ServiceNode(props: NodeProps) {
  const { color = '#f472b6' } = props;

  return (
    <BaseNode {...props}>
      <mesh>
        <boxGeometry args={[1, 0.6, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}
