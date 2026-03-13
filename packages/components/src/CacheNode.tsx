import React from 'react';
import { Outlines } from '@react-three/drei';
import { BaseNode } from './BaseNode';
import { NodeProps } from './types';

export function CacheNode({ color = '#f5a442', glow, selected, ...props }: NodeProps) {
  return (
    <BaseNode selected={selected} {...props}>
      <mesh>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color={color} emissive={glow ? color : '#000000'} emissiveIntensity={0.5} />
        {selected && <Outlines thickness={0.05} color="white" />}
      </mesh>
    </BaseNode>
  );
}
