import React from 'react';
import { Outlines, RoundedBox } from '@react-three/drei';
import { BaseNode } from './BaseNode';
import { NodeProps } from './types';

export function GatewayNode({ color = '#a855f7', glow, selected, ...props }: NodeProps) {
  return (
    <BaseNode selected={selected} {...props}>
      <RoundedBox args={[1.5, 0.4, 1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color={color} emissive={glow ? color : '#000000'} emissiveIntensity={0.5} />
        {selected && <Outlines thickness={0.05} color="white" />}
      </RoundedBox>
    </BaseNode>
  );
}
