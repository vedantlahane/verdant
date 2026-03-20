import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function GatewayNode(props: NodeProps) {
  const { color = '#06b6d4' } = props;

  return (
    <BaseNode {...props}>
      <mesh>
        <torusGeometry args={[0.5, 0.2, 8, 48]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}
