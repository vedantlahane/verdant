// packages/components/src/nodes/MonitorNode.tsx

import React from 'react';
import { RoundedBox } from '@react-three/drei';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function MonitorNode(props: NodeProps) {
  const { color = '#10b981' } = props;

  return (
    <BaseNodeWrapper {...props}>
      {/* Screen */}
      <RoundedBox args={[1.2, 0.8, 0.08]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
      </RoundedBox>
      {/* Screen face (darker) */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.0, 0.6]} />
        <meshStandardMaterial
          color="#0a0a0a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Chart line on screen */}
      {[
        [-0.3, -0.1],
        [-0.1, 0.1],
        [0.1, -0.05],
        [0.3, 0.15],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.06]}>
          <circleGeometry args={[0.03, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      {/* Stand */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial color="#6B7280" />
      </mesh>
      {/* Base */}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
        <meshStandardMaterial color="#6B7280" />
      </mesh>
    </BaseNodeWrapper>
  );
}