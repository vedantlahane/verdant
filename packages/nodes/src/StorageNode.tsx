import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function StorageNode(props: NodeProps) {
  const { color = '#34d399' } = props;

  return (
    <BaseNode {...props}>
      <mesh>
        <boxGeometry args={[1.1, 0.7, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}
