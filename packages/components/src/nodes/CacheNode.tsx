// packages/components/src/nodes/CacheNode.tsx

import React from 'react';
import { NodeProps } from '../types';
import { BaseNodeWrapper } from './BaseNodeWrapper';

export function CacheNode(props: NodeProps) {
  const { color = '#f5a442' } = props;

  return (
    <BaseNodeWrapper {...props}>
      <mesh>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial
          color={color}
          metalness={0.5}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* Lightning bolt indicator (simple diamond shape) */}
      <mesh position={[0, 0, 0.56]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </BaseNodeWrapper>
  );
}