import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';
import { nodeRegistry } from './registry';

const defaultPorts = [
  { name: 'get', side: 'left' as const },
  { name: 'set', side: 'right' as const },
];

const defaultStatus = 'unknown' as const;

export function CacheNode(props: NodeProps) {
  const { color = '#f97316' } = props;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BaseNode {...props} status={props.status ?? defaultStatus} ports={props.ports ?? (defaultPorts as any)}>
      <mesh>
        <boxGeometry args={[0.9, 0.5, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}

nodeRegistry.register('cache', CacheNode);
