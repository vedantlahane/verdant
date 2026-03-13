import React from 'react';
import { Outlines } from '@react-three/drei';
import { BaseNode } from './BaseNode';
import { NodeProps } from './types';

export function UserNode({ color = '#ec4899', glow, selected, ...props }: NodeProps) {
  return (
    <BaseNode selected={selected} {...props}>
      <group position={[0, -0.2, 0]}>
        {/* Head */}
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color={color} emissive={glow ? color : '#000000'} emissiveIntensity={0.5} />
          {selected && <Outlines thickness={0.05} color="white" />}
        </mesh>
        {/* Body (Cone acting as shoulders/torso) */}
        <mesh position={[0, -0.2, 0]}>
          <coneGeometry args={[0.5, 1, 32]} />
          <meshStandardMaterial color={color} emissive={glow ? color : '#000000'} emissiveIntensity={0.5} />
          {selected && <Outlines thickness={0.05} color="white" />}
        </mesh>
      </group>
    </BaseNode>
  );
}
