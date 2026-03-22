import React from 'react';
import { RoundedBox } from '@react-three/drei';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';
import { nodeRegistry } from './registry';

const defaultPorts = [
  { name: 'in', side: 'left' as const },
  { name: 'out', side: 'right' as const },
  { name: 'health', side: 'top' as const },
];

const defaultStatus = 'unknown' as const;

export function ServerNode(props: NodeProps) {
  const { color = '#4287f5' } = props;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <BaseNode {...props} status={props.status ?? defaultStatus} ports={props.ports ?? (defaultPorts as any)}>
      <RoundedBox args={[1.2, 0.8, 0.6]} radius={0.08} smoothness={4}>
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.6}
        />
      </RoundedBox>
      <mesh position={[0.4, 0.25, 0.31]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>
    </BaseNode>
  );
}

nodeRegistry.register('server', ServerNode);
