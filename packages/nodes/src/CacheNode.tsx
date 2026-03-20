import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function CacheNode(props: NodeProps) {
  const { color = '#f97316' } = props;

  return (
    <BaseNode {...props}>
      <mesh>
        <boxGeometry args={[0.9, 0.5, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}
