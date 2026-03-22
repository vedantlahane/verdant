import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';
import { nodeRegistry } from './registry';

const defaultPorts = [
  { name: 'read', side: 'left' as const },
  { name: 'write', side: 'right' as const },
  { name: 'replica', side: 'back' as const },
];

const defaultStatus = 'unknown' as const;

export function DatabaseNode(props: NodeProps) {
  const { color = '#42f554' } = props;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BaseNode {...props} status={props.status ?? defaultStatus} ports={props.ports ?? (defaultPorts as any)}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 0.9, 24]} />
        <meshStandardMaterial
          color={color}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>
      <mesh position={[0, 0.45, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.04, 24]} />
        <meshStandardMaterial
          color={color}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
    </BaseNode>
  );
}

nodeRegistry.register('database', DatabaseNode);
