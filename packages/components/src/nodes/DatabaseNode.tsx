// packages/components/src/nodes/DatabaseNode.tsx

import React from 'react';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function DatabaseNode(props: NodeProps) {
  const { color = '#42f554' } = props;

  return (
    <BaseNodeWrapper {...props}>
      {/* Cylinder body */}
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 0.9, 24]} />
        <meshStandardMaterial
          color={color}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>
      {/* Top lid ellipse (gives DB look) */}
      <mesh position={[0, 0.45, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.04, 24]} />
        <meshStandardMaterial
          color={color}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
    </BaseNodeWrapper>
  );
}