// packages/components/src/nodes/GatewayNode.tsx

import React from 'react';
import { RoundedBox } from '@react-three/drei';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function GatewayNode(props: NodeProps) {
  const { color = '#a855f7' } = props;

  return (
    <BaseNodeWrapper {...props}>
      {/* Wide flat box = gateway shape */}
      <RoundedBox args={[1.6, 0.5, 0.5]} radius={0.06} smoothness={4}>
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.6}
        />
      </RoundedBox>
      {/* Arrow indicator on front face */}
      <mesh position={[0, 0, 0.26]}>
        <planeGeometry args={[0.6, 0.15]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
        />
      </mesh>
    </BaseNodeWrapper>
  );
}