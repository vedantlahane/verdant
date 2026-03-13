import React from 'react';
import { Outlines, RoundedBox } from '@react-three/drei';
import { BaseNode } from './BaseNode';
import { NodeProps } from './types';

export function ServiceNode({ color = '#64748b', glow, selected, ...props }: NodeProps) {
  return (
    <BaseNode selected={selected} {...props}>
      <RoundedBox args={[0.8, 0.8, 0.8]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color={color} emissive={glow ? color : '#000000'} emissiveIntensity={0.5} />
        {selected && <Outlines thickness={0.05} color="white" />}
      </RoundedBox>
    </BaseNode>
  );
}
