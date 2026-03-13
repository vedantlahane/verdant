import { ThreeEvent } from '@react-three/fiber';

export interface NodeProps {
  label?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | number;
  position?: [number, number, number];
  glow?: boolean;
  selected?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

export interface EdgeProps {
  from: [number, number, number];
  to: [number, number, number];
  label?: string;
  color?: string;
  animated?: boolean;
  style?: 'solid' | 'dashed';
}
