// packages/components/src/nodes/ServiceNode.tsx

import React from 'react';
import { RoundedBox } from '@react-three/drei';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function ServiceNode(props: NodeProps) {
  const { color = '#64748b' } = props;

  return (
    <BaseNodeWrapper {...props}>
      <RoundedBox args={[0.8, 0.8, 0.5]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          color={color}
          metalness={0.2}
          roughness={0.7}
        />
      </RoundedBox>
      {/* Gear indicator */}
      <mesh position={[0, 0, 0.26]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.12, 0.2, 6]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
          side={2} // DoubleSide
        />
      </mesh>
    </BaseNodeWrapper>
  );
}