import React from 'react';
import { GroupContainer } from './GroupContainer';

export interface NestedGroupProps {
  label?: string;
  color?: string;
  collapsed?: boolean;
  depth?: number;
  children?: React.ReactNode;
}

export function NestedGroup({
  label,
  color = '#ffffff',
  collapsed = false,
  depth = 0,
  children,
}: NestedGroupProps) {
  // Apply a slight visual offset and scale reduction per nesting level
  const offset = depth * 0.3;
  const scale = Math.max(0.5, 1 - depth * 0.05);

  return (
    <group position={[offset, offset, 0]} scale={[scale, scale, scale]}>
      <GroupContainer
        label={label}
        color={color}
        opacity={Math.max(0.02, 0.05 - depth * 0.01)}
        collapsed={collapsed}
      >
        {children}
      </GroupContainer>
    </group>
  );
}
