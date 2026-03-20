import { ThreeEvent } from '@react-three/fiber';

export interface NodeProps {
  label: string;
  position: [number, number, number];
  selected?: boolean;
  hovered?: boolean;
  color?: string;
  size?: string;
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
  style?: string;
  color?: string;
  width?: number;
}

export const SIZE_SCALE: Record<string, number> = {
  sm: 0.6,
  md: 1.0,
  lg: 1.4,
  xl: 1.8,
};
