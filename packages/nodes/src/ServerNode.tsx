import React from 'react';
import { RoundedBox } from '@react-three/drei';
import { NodeProps } from '@verdant/primitives';
import { BaseNode } from '@verdant/primitives';

export function ServerNode(props: NodeProps) {
  const { color = '#4287f5' } = props;

  return (
    <BaseNode {...props}>
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
