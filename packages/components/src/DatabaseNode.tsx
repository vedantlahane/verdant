import React from 'react';
import { Outlines } from '@react-three/drei';
import { BaseNode } from './BaseNode';
import { NodeProps } from './types';

export function DatabaseNode({ color = '#42f554', glow, selected, ...props }: NodeProps) {
  return (
    <BaseNode selected={selected} {...props}>
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 1.2, 32]} />
        <meshStandardMaterial color={color} emissive={glow ? color : '#000000'} emissiveIntensity={0.5} />
        {selected && <Outlines thickness={0.05} color="white" />}
      </mesh>
      {/* Horizontal bands to symbolize disks */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.05, 32]} />
        <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
      </mesh>
    </BaseNode>
  );
}
