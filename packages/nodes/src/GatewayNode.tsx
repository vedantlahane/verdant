import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';
import { nodeRegistry } from './registry';

const defaultPorts = [
  { name: 'ingress', side: 'left' as const },
  { name: 'egress', side: 'right' as const },
  { name: 'admin', side: 'top' as const },
];

const defaultStatus = 'unknown' as const;

export function GatewayNode(props: NodeProps) {
  const { color = '#06b6d4' } = props;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BaseNode {...props} status={props.status ?? defaultStatus} ports={props.ports ?? (defaultPorts as any)}>
      <mesh>
        <torusGeometry args={[0.5, 0.2, 8, 48]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>
    </BaseNode>
  );
}

nodeRegistry.register('gateway', GatewayNode);
