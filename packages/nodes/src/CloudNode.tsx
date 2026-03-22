import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';
import { nodeRegistry } from './registry';

const defaultPorts = [
  { name: 'in', side: 'left' as const },
  { name: 'out', side: 'right' as const },
];

const defaultStatus = 'unknown' as const;

export function CloudNode(props: NodeProps) {
  const { color = '#93c5fd' } = props;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BaseNode {...props} status={props.status ?? defaultStatus} ports={props.ports ?? (defaultPorts as any)}>
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
      </mesh>
    </BaseNode>
  );
}

nodeRegistry.register('cloud', CloudNode);
