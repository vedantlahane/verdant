import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';
import { nodeRegistry } from './registry';

const defaultPorts = [
  { name: 'in', side: 'left' as const },
  { name: 'out', side: 'right' as const },
];

const defaultStatus = 'unknown' as const;

export function ServiceNode(props: NodeProps) {
  const { color = '#f472b6' } = props;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BaseNode {...props} status={props.status ?? defaultStatus} ports={props.ports ?? (defaultPorts as any)}>
      <mesh>
        <boxGeometry args={[1, 0.6, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}

nodeRegistry.register('service', ServiceNode);
