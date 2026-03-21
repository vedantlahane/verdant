import { ThreeEvent } from '@react-three/fiber';
import type { NodePort } from './shapes/ShapeDefinition';

export type { NodePort };

// v2 types
export type NodeStatus = 'healthy' | 'warning' | 'error' | 'unknown';
export type AnimationType = 'fade' | 'scale' | 'slide';

export interface NodeBadge {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  content: string;
  color?: string;
}

export interface DataBindingConfig {
  [property: string]: unknown;
}

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
  // v2 additions (all optional for backward compat)
  id?: string;
  status?: NodeStatus;
  badges?: NodeBadge[];
  shape?: string;
  enterAnimation?: AnimationType;
  exitAnimation?: AnimationType;
  animationDuration?: number;
  ports?: NodePort[];
  bindings?: DataBindingConfig;
}

export interface FlowParticleConfig {
  speed?: number;   // seconds per traversal, default 2.0
  count?: number;   // simultaneous particles, default 5
  color?: string;   // defaults to parent edge color
}

export interface EdgeLineProps {
  from: [number, number, number];
  to: [number, number, number];
  label?: string;
  animated?: boolean;
  style?: string;
  color?: string;
  width?: number;
  // v2 additions (all optional for backward compat)
  id?: string;
  fromNodeId?: string;
  toNodeId?: string;
  fromPort?: string;
  toPort?: string;
  routing?: 'straight' | 'curved' | 'orthogonal';
  flowParticles?: FlowParticleConfig;
}

export const SIZE_SCALE: Record<string, number> = {
  sm: 0.6,
  md: 1.0,
  lg: 1.4,
  xl: 1.8,
};
