import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function QueueNode(props: NodeProps) {
  const { color = '#f59e0b' } = props;

  return (
    <BaseNode {...props}>
      <mesh>
        <boxGeometry args={[0.9, 0.9, 0.4]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}
