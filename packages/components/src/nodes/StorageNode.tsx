// packages/components/src/nodes/StorageNode.tsx

import React from 'react';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function StorageNode(props: NodeProps) {
  const { color = '#8b5cf6' } = props;

  return (
    <BaseNodeWrapper {...props}>
      {/* Disk shape: flat cylinder */}
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 0.2, 24]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Stacked disks effect */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.15, 24]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.39, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.12, 24]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Center spindle */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
    </BaseNodeWrapper>
  );
}