// packages/components/src/nodes/UserNode.tsx

import React from 'react';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function UserNode(props: NodeProps) {
  const { color = '#ec4899' } = props;

  return (
    <BaseNodeWrapper {...props}>
      {/* Head */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Body (tapered cylinder) */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 0.6, 16]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.7} />
      </mesh>
    </BaseNodeWrapper>
  );
}