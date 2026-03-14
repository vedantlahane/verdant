// packages/components/src/nodes/QueueNode.tsx

import React from 'react';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function QueueNode(props: NodeProps) {
  const { color = '#f59e0b' } = props;

  return (
    <BaseNodeWrapper {...props}>
      {/* Tube/pipe shape */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 1.4, 16, 1, true]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.5}
          side={2}
        />
      </mesh>
      {/* End caps */}
      <mesh position={[-0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <circleGeometry args={[0.3, 16]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <circleGeometry args={[0.3, 16]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Queue line indicators */}
      {[-0.3, 0, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.31]}>
          <planeGeometry args={[0.06, 0.35]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
      ))}
    </BaseNodeWrapper>
  );
}