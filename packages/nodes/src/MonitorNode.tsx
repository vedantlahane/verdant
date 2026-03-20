import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function MonitorNode(props: NodeProps) {
  const { color = '#fde68a' } = props;

  return (
    <BaseNode {...props}>
      <mesh>
        <boxGeometry args={[1, 0.6, 0.2]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
      </mesh>
    </BaseNode>
  );
}
