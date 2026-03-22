import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';
import { nodeRegistry } from './registry';

const defaultPorts = [
  { name: 'metrics', side: 'left' as const },
  { name: 'alerts', side: 'right' as const },
];

const defaultStatus = 'unknown' as const;

export function MonitorNode(props: NodeProps) {
  const { color = '#fde68a' } = props;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BaseNode {...props} status={props.status ?? defaultStatus} ports={props.ports ?? (defaultPorts as any)}>
      <mesh>
        <boxGeometry args={[1, 0.6, 0.2]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.7} />
      </mesh>
    </BaseNode>
  );
}

nodeRegistry.register('monitor', MonitorNode);
