import React from 'react';
import { Outlines, RoundedBox } from '@react-three/drei';
import { BaseNode } from './BaseNode';
import { NodeProps } from './types';
import * as THREE from 'three';

export function ServerNode({ color = '#4287f5', glow, selected, ...props }: NodeProps) {
  return (
    <BaseNode selected={selected} {...props}>
      <RoundedBox args={[1, 1.2, 1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color={color} emissive={glow ? color : '#000000'} emissiveIntensity={0.5} />
        {selected && <Outlines thickness={0.05} color="white" />}
      </RoundedBox>
      {/* Screen icon representation for Server */}
      <mesh position={[0, 0.2, 0.51]}>
        <planeGeometry args={[0.7, 0.4]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>
    </BaseNode>
  );
}
