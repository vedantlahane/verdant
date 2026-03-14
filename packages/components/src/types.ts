// packages/components/src/types.ts

import { ThreeEvent } from '@react-three/fiber';

export interface NodeProps {
  label: string;
  position: [number, number, number];
  selected?: boolean;
  hovered?: boolean;
  color?: string;
  size?: string;       // 'sm' | 'md' | 'lg' | 'xl'
  glow?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

export interface EdgeLineProps {
  from: [number, number, number];
  to: [number, number, number];
  label?: string;
  animated?: boolean;
  style?: string;      // 'solid' | 'dashed' | 'animated' | 'dotted'
  color?: string;
  width?: number;
}

/** Scale multiplier based on size prop */
export const SIZE_SCALE: Record<string, number> = {
  sm: 0.6,
  md: 1.0,
  lg: 1.4,
  xl: 1.8,
};