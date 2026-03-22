// primitives/src/types.ts

import type { ThreeEvent } from '@react-three/fiber';
import type { NodePort } from './shapes/ShapeDefinition';

export type { NodePort };

// ── Enums / Unions ──────────────────────────────────────────

/** Visual health status for a node. */
export type NodeStatus = 'healthy' | 'warning' | 'error' | 'unknown';

/** Built-in enter/exit animation types. */
export type AnimationType = 'fade' | 'scale' | 'slide';

/** Edge line style. */
export type EdgeStyle = 'solid' | 'dashed' | 'dotted' | 'animated';

/** Edge path algorithm. */
export type RoutingAlgorithm = 'straight' | 'curved' | 'orthogonal';

/** Badge anchor position relative to node bounding box. */
export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

// ── Badge ───────────────────────────────────────────────────

/** Decorative badge rendered at a corner of a node. */
export interface NodeBadge {
  /** Anchor position on the node. Must be unique per node. */
  position: BadgePosition;
  /** Display text (number, short string, or icon key prefixed with `icon:`). */
  content: string;
  /** Badge background color. Defaults to node color. */
  color?: string;
  /** Optional icon identifier (e.g. `"shield"`, `"lock"`). */
  icon?: string;
}

// ── Data Binding ────────────────────────────────────────────

/**
 * Maps node/edge property names to observable source keys.
 * The `DataBinding` system resolves these keys to live data streams.
 */
export interface DataBindingConfig {
  status?: string;
  label?: string;
  color?: string;
  badges?: string;
  /** Catch-all for custom bound properties. */
  [property: string]: string | undefined;
}

// ── Flow Particles ──────────────────────────────────────────

/** Configuration for animated particles traveling along an edge path. */
export interface FlowParticleConfig {
  /** Seconds for one full traversal. @default 2.0 */
  speed?: number;
  /** Number of simultaneous particles. @default 5 */
  count?: number;
  /** Particle color. Defaults to parent edge color. */
  color?: string;
  /** Particle sphere radius in world units. @default 0.06 */
  size?: number;
}

// ── Node Props ──────────────────────────────────────────────

export interface NodeProps {
  // ── v1 core (always present) ──
  label: string;
  position: [number, number, number];
  selected?: boolean;
  hovered?: boolean;
  color?: string;
  /** Size key from SIZE_SCALE. @default "md" */
  size?: string;
  glow?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;

  // ── v2 additions (all optional for backward compat) ──

  /** Unique node identifier for selection, ports, and persistence. */
  id?: string;
  /** Health status. Drives material color/pulse when set. */
  status?: NodeStatus;
  /** Corner badges (icon, count, etc.). Duplicate positions are warned and skipped. */
  badges?: NodeBadge[];
  /** Shape override key registered in ShapeRegistry. */
  shape?: string;
  /** Animation played on mount. @default undefined (instant appear) */
  enterAnimation?: AnimationType;
  /** Animation played before unmount. @default undefined (instant disappear) */
  exitAnimation?: AnimationType;
  /** Duration in ms for enter/exit animations. @default 300 */
  animationDuration?: number;
  /** Named connection ports. Shapes provide defaults; this overrides them. */
  ports?: NodePort[];
  /** Live data binding configuration. */
  bindings?: DataBindingConfig;
  /** Enable floating breathing animation. @default true */
  breathe?: boolean;
  /** Prevent user from dragging this node. @default false */
  locked?: boolean;
  /** Hide this node visually without removing from graph. @default true */
  visible?: boolean;
  /** Secondary text rendered below the label. */
  subtitle?: string;
}

// ── Edge Props ──────────────────────────────────────────────

export interface EdgeLineProps {
  // ── v1 core ──
  from: [number, number, number];
  to: [number, number, number];
  label?: string;
  animated?: boolean;
  /** Line style. @default "solid" */
  style?: EdgeStyle;
  color?: string;
  /** Line width in pixels. @default 1.5 */
  width?: number;

  // ── v2 additions ──

  /** Unique edge identifier. */
  id?: string;
  /** Source node ID (used for port resolution). */
  fromNodeId?: string;
  /** Target node ID (used for port resolution). */
  toNodeId?: string;
  /** Named port on source node. Falls back to node center if not found. */
  fromPort?: string;
  /** Named port on target node. Falls back to node center if not found. */
  toPort?: string;
  /** Path algorithm. @default "curved" */
  routing?: RoutingAlgorithm;
  /** Animated particles along the edge. Omit to disable. */
  flowParticles?: FlowParticleConfig;
  /** Whether this edge is currently selected. */
  selected?: boolean;
  /** Whether this edge is currently hovered. */
  hovered?: boolean;
}

// ── Constants ───────────────────────────────────────────────

/** Maps size key → uniform scale multiplier. */
export const SIZE_SCALE = {
  sm: 0.6,
  md: 1.0,
  lg: 1.4,
  xl: 1.8,
} as const;

export type SizeKey = keyof typeof SIZE_SCALE;