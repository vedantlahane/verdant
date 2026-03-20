import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function UserNode(props: NodeProps) {
  const { color = '#60a5fa' } = props;

  return (
    <BaseNode {...props}>
      <mesh>
        <sphereGeometry args={[0.6, 24, 24]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}
