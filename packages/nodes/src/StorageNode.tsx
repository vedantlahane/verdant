import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';
import { nodeRegistry } from './registry';

const defaultPorts = [
  { name: 'read', side: 'left' as const },
  { name: 'write', side: 'right' as const },
];

const defaultStatus = 'unknown' as const;

export function StorageNode(props: NodeProps) {
  const { color = '#34d399' } = props;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BaseNode {...props} status={props.status ?? defaultStatus} ports={props.ports ?? (defaultPorts as any)}>
      <mesh>
        <boxGeometry args={[1.1, 0.7, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}

nodeRegistry.register('storage', StorageNode);
