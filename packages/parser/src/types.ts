// parser/types.ts — Pure AST type definitions

// ── Enums ──

export type LayoutType = 'auto' | 'grid' | 'circular' | 'hierarchical' | 'forced';
export type CameraType = 'perspective' | 'orthographic';
export type NodeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type EdgeStyle = 'solid' | 'dashed' | 'animated' | 'dotted';
export type NodeStatus = 'healthy' | 'warning' | 'error' | 'unknown';
export type AnimationType = 'fade' | 'scale' | 'slide';
export type RoutingType = 'straight' | 'curved' | 'orthogonal';
export type PortSide = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type ShapeType =
  | 'cube' | 'cylinder' | 'diamond' | 'sphere' | 'torus'
  | 'hexagon' | 'pentagon' | 'octagon' | 'ring' | 'box'
  | 'cone' | 'capsule' | 'icosahedron' | 'plane';

export type KnownNodeType =
  (typeof import('./constants').NODE_TYPE_CATEGORIES)[keyof typeof import('./constants').NODE_TYPE_CATEGORIES][number];

// ── Source Location ──

export interface SourceLocation {
  line: number;
  col: number;
}

// ── Sub-types ──

export interface VrdBadge {
  readonly position: BadgePosition;
  readonly content: string;
}

export interface VrdPort {
  readonly name: string;
  readonly side: PortSide;
}

export interface VrdAnimationKeyframe {
  readonly target: string;
  readonly property: string;
  readonly from: unknown;
  readonly to: unknown;
}

export interface VrdAnimationTimeline {
  readonly name: string;
  readonly duration: number;
  readonly keyframes: readonly VrdAnimationKeyframe[];
}

// ── Config ──

export interface VrdConfig {
  theme?: string;
  layout?: LayoutType;
  camera?: CameraType;
  pack?: string;
  minimap?: boolean;
  'post-processing'?: boolean;
  'bloom-intensity'?: number;
  'snap-to-grid'?: boolean;
  'grid-size'?: number;
  direction?: string;
  'layer-spacing'?: number;
  'node-spacing'?: number;
  animations?: VrdAnimationTimeline[];
  [key: string]: unknown;
}

// ── Nodes ──

export interface VrdNodeProps {
  label?: string;
  color?: string;
  size?: NodeSize;
  glow?: boolean;
  icon?: string;
  position?: { x: number; y: number; z: number };
  shape?: ShapeType;
  status?: NodeStatus;
  badges?: VrdBadge[];
  ports?: VrdPort[];
  enterAnimation?: AnimationType;
  exitAnimation?: AnimationType;
  animationDuration?: number;
  opacity?: number;
  scale?: number;
  [key: string]: unknown;
}

export interface VrdNode {
  readonly id: string;
  readonly type: string;
  readonly props: VrdNodeProps;
  readonly groupId?: string;
  readonly loc?: SourceLocation;
}

// ── Edges ──

export interface VrdEdgeProps {
  label?: string;
  style?: EdgeStyle;
  color?: string;
  width?: number;
  bidirectional?: boolean;
  fromPort?: string;
  toPort?: string;
  routing?: RoutingType;
  flow?: boolean;
  flowSpeed?: number;
  flowCount?: number;
  flowColor?: string;
  [key: string]: unknown;
}

export interface VrdEdge {
  readonly from: string;
  readonly to: string;
  readonly props: VrdEdgeProps;
  readonly loc?: SourceLocation;
}

// ── Groups ──

export interface VrdGroupProps {
  collapsed?: boolean;
  layout?: LayoutType;
  [key: string]: unknown;
}

export interface VrdGroup {
  readonly id: string;
  readonly label?: string;
  readonly children: readonly string[];
  readonly groups: readonly VrdGroup[];
  readonly parentGroupId?: string;
  readonly props: VrdGroupProps;
  readonly loc?: SourceLocation;
}

// ── AST Root ──

export interface VrdAST {
  readonly config: VrdConfig;
  readonly nodes: readonly VrdNode[];
  readonly edges: readonly VrdEdge[];
  readonly groups: readonly VrdGroup[];
}

// ── Diagnostics ──

export interface VrdDiagnostic {
  line: number;
  col?: number;
  severity: DiagnosticSeverity;
  message: string;
}

export interface VrdParseResult {
  readonly ast: VrdAST;
  readonly diagnostics: readonly VrdDiagnostic[];
}