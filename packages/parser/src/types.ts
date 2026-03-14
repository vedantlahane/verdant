// ============================================
// Verdant AST Types — v2.0
// Matches context document specification
// ============================================

/** Known built-in component types */
export const KNOWN_NODE_TYPES = [
  'server', 'database', 'cache', 'gateway', 'service',
  'user', 'cloud', 'queue', 'storage', 'monitor',
  // Client alias
  'client',
] as const;

export type KnownNodeType = typeof KNOWN_NODE_TYPES[number];

/** Valid layout options */
export type LayoutType = 'auto' | 'grid' | 'circular';

/** Valid camera options */
export type CameraType = 'perspective' | 'orthographic';

/** Valid size options */
export type NodeSize = 'sm' | 'md' | 'lg' | 'xl';

/** Valid edge styles */
export type EdgeStyle = 'solid' | 'dashed' | 'animated' | 'dotted';

// ---- Config ----

export interface VrdConfig {
  theme?: string;
  layout?: LayoutType;
  camera?: CameraType;
  pack?: string;
  [key: string]: unknown;
}

// ---- Nodes ----

export interface VrdNodeProps {
  label?: string;
  color?: string;
  size?: NodeSize;
  glow?: boolean;
  icon?: string;
  position?: { x: number; y: number; z: number };
  [key: string]: unknown;
}

export interface VrdNode {
  id: string;
  type: string;
  props: VrdNodeProps;
  groupId?: string;
}

// ---- Edges ----

export interface VrdEdgeProps {
  label?: string;
  style?: EdgeStyle;
  color?: string;
  width?: number;
}

export interface VrdEdge {
  from: string;
  to: string;
  props: VrdEdgeProps;
}

// ---- Groups ----

export interface VrdGroup {
  id: string;
  label?: string;
  children: string[];       // node IDs
  groups: VrdGroup[];       // nested sub-groups
  parentGroupId?: string;   // if nested
}

// ---- AST Root ----

export interface VrdAST {
  config: VrdConfig;
  nodes: VrdNode[];
  edges: VrdEdge[];
  groups: VrdGroup[];
}

// ---- Diagnostics ----

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface VrdDiagnostic {
  line: number;
  severity: DiagnosticSeverity;
  message: string;
}

export interface VrdParseResult {
  ast: VrdAST;
  diagnostics: VrdDiagnostic[];
}

// ---- Error ----

export class VrdParserError extends Error {
  constructor(message: string, public line: number) {
    super(`[Line ${line}] ${message}`);
    this.name = 'VrdParserError';
  }
}