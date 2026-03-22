// ============================================
// Verdant AST Types — v3.0
// ============================================

// ── Known built-in node types, organized by category ──

export const NODE_TYPE_CATEGORIES = {
  compute: [
    'server', 'service', 'microservice', 'function', 'lambda',
    'container', 'pod', 'worker', 'vm', 'task', 'instance', 'process',
  ],
  storage: [
    'database', 'cache', 'storage', 'bucket', 'datalake',
    'warehouse', 'filesystem', 'volume', 'table', 'datastore',
  ],
  network: [
    'gateway', 'loadbalancer', 'proxy', 'firewall', 'cdn',
    'dns', 'router', 'switch', 'api', 'endpoint', 'ingress',
  ],
  messaging: [
    'queue', 'topic', 'stream', 'bus', 'broker', 'pubsub', 'event',
  ],
  cloud: [
    'cloud', 'region', 'zone', 'vpc', 'subnet',
    'cluster', 'namespace', 'network',
  ],
  client: [
    'user', 'client', 'browser', 'mobile',
    'iot', 'device', 'desktop', 'app',
  ],
  observability: [
    'monitor', 'logger', 'tracer', 'alerter',
    'dashboard', 'metric',
  ],
  security: [
    'auth', 'vault', 'waf', 'certificate',
    'identity', 'secret', 'kms', 'sso',
  ],
  cicd: [
    'pipeline', 'registry', 'artifact',
    'build', 'deploy', 'repository',
  ],
  generic: [
    'webhook', 'cron', 'scheduler', 'config',
    'mesh', 'sidecar', 'plugin',
  ],
} as const;

// Flatten all categories into a single array
function flattenCategories(): readonly string[] {
  const all: string[] = [];
  for (const entries of Object.values(NODE_TYPE_CATEGORIES)) {
    for (const t of entries) {
      all.push(t);
    }
  }
  return Object.freeze(all);
}

export const KNOWN_NODE_TYPES: readonly string[] = flattenCategories();

/** Fast lookup set — used internally by parser */
export const KNOWN_NODE_TYPES_SET: ReadonlySet<string> = new Set(KNOWN_NODE_TYPES);

export type KnownNodeType = (typeof NODE_TYPE_CATEGORIES)[keyof typeof NODE_TYPE_CATEGORIES][number];

// ── Shape mapping hints (used by NodeRegistry / tooling) ──

export const NODE_TYPE_SHAPE_HINTS: Record<string, string> = {
  // Compute → cube
  server: 'cube', service: 'cube', microservice: 'cube', worker: 'cube',
  task: 'cube', instance: 'cube', process: 'cube', build: 'cube',
  deploy: 'cube', config: 'cube', plugin: 'cube',

  // Functions → pentagon
  function: 'pentagon', lambda: 'pentagon', webhook: 'pentagon',
  cron: 'pentagon', scheduler: 'pentagon',

  // Storage → cylinder
  database: 'cylinder', storage: 'cylinder', bucket: 'cylinder',
  datalake: 'cylinder', warehouse: 'cylinder', filesystem: 'cylinder',
  volume: 'cylinder', table: 'cylinder', datastore: 'cylinder',
  repository: 'cylinder', artifact: 'cylinder',

  // Network → diamond
  gateway: 'diamond', api: 'diamond', endpoint: 'diamond',
  loadbalancer: 'diamond', proxy: 'diamond', ingress: 'diamond',

  // Messaging → torus
  queue: 'torus', topic: 'torus', stream: 'torus', bus: 'torus',
  broker: 'torus', pubsub: 'torus', event: 'torus',

  // Client → sphere
  user: 'sphere', client: 'sphere', browser: 'sphere', mobile: 'sphere',
  desktop: 'sphere', device: 'sphere', iot: 'sphere', app: 'sphere',
  cloud: 'sphere',

  // Monitoring → hexagon
  cache: 'hexagon', monitor: 'hexagon', metric: 'hexagon',
  dashboard: 'hexagon', logger: 'hexagon', tracer: 'hexagon',
  alerter: 'hexagon',

  // Security → octagon
  auth: 'octagon', vault: 'octagon', waf: 'octagon',
  certificate: 'octagon', identity: 'octagon', secret: 'octagon',
  kms: 'octagon', sso: 'octagon', firewall: 'octagon',

  // Infrastructure → ring
  cdn: 'ring', dns: 'ring', router: 'ring', switch: 'ring',
  mesh: 'ring', sidecar: 'ring', vpc: 'ring', subnet: 'ring',
  cluster: 'ring', namespace: 'ring', network: 'ring',
  region: 'ring', zone: 'ring',

  // Container → box
  container: 'box', pod: 'box', vm: 'box',
  pipeline: 'box', registry: 'box',
};

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

export type ShapeType =
  | 'cube'
  | 'cylinder'
  | 'diamond'
  | 'sphere'
  | 'torus'
  | 'hexagon'
  | 'pentagon'
  | 'octagon'
  | 'ring'
  | 'box'
  | 'cone'
  | 'capsule'
  | 'icosahedron'
  | 'plane';

// ── Source Location (optional, for tooling) ──

export interface SourceLocation {
  line: number;
  col: number;
}

// ── Sub-types ──

export interface VrdBadge {
  position: BadgePosition;
  content: string;
}

export interface VrdPort {
  name: string;
  side: PortSide;
}

export interface VrdAnimationKeyframe {
  target: string;
  property: string;
  from: unknown;
  to: unknown;
}

export interface VrdAnimationTimeline {
  name: string;
  duration: number;
  keyframes: VrdAnimationKeyframe[];
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

/** Config keys we recognize (for validation) */
export const KNOWN_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'theme', 'layout', 'camera', 'pack', 'title', 'description',
  'minimap', 'post-processing', 'bloom-intensity', 'snap-to-grid',
  'grid-size', 'direction', 'layer-spacing', 'node-spacing',
]);

/** Valid layout values */
export const VALID_LAYOUTS: ReadonlySet<string> = new Set(['auto', 'grid', 'circular', 'hierarchical', 'forced']);

/** Valid shapes */
export const VALID_SHAPES: ReadonlySet<string> = new Set([
  'cube', 'cylinder', 'diamond', 'sphere', 'torus',
  'hexagon', 'pentagon', 'octagon', 'ring', 'box',
  'cone', 'capsule', 'icosahedron', 'plane',
]);

/** Valid node status values */
export const VALID_STATUSES: ReadonlySet<string> = new Set(['healthy', 'warning', 'error', 'unknown']);

/** Valid animation type values */
export const VALID_ANIMATION_TYPES: ReadonlySet<string> = new Set(['fade', 'scale', 'slide']);

/** Valid routing type values */
export const VALID_ROUTING_TYPES: ReadonlySet<string> = new Set(['straight', 'curved', 'orthogonal']);

/** Valid port side values */
export const VALID_PORT_SIDES: ReadonlySet<string> = new Set(['top', 'bottom', 'left', 'right', 'front', 'back']);

/** Valid badge position values */
export const VALID_BADGE_POSITIONS: ReadonlySet<string> = new Set(['top-right', 'top-left', 'bottom-right', 'bottom-left']);

/** Valid camera values */
export const VALID_CAMERAS: ReadonlySet<string> = new Set(['perspective', 'orthographic']);

/** Valid size values */
export const VALID_SIZES: ReadonlySet<string> = new Set(['xs', 'sm', 'md', 'lg', 'xl']);

/** Valid edge style values */
export const VALID_EDGE_STYLES: ReadonlySet<string> = new Set([
  'solid', 'dashed', 'animated', 'dotted',
]);

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
  [key: string]: unknown;
}

export interface VrdNode {
  id: string;
  type: string;
  props: VrdNodeProps;
  groupId?: string;
  loc?: SourceLocation;
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
  from: string;
  to: string;
  props: VrdEdgeProps;
  loc?: SourceLocation;
}

// ── Groups ──

export interface VrdGroupProps {
  collapsed?: boolean;
  layout?: LayoutType;
  [key: string]: unknown;
}

export interface VrdGroup {
  id: string;
  label?: string;
  children: string[];
  groups: VrdGroup[];
  parentGroupId?: string;
  props: VrdGroupProps;
  loc?: SourceLocation;
}

// ── AST Root ──

export interface VrdAST {
  config: VrdConfig;
  nodes: VrdNode[];
  edges: VrdEdge[];
  groups: VrdGroup[];
}

// ── Diagnostics ──

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface VrdDiagnostic {
  line: number;
  col?: number;
  severity: DiagnosticSeverity;
  message: string;
}

export interface VrdParseResult {
  ast: VrdAST;
  diagnostics: VrdDiagnostic[];
}

// ── Error ──

export class VrdParserError extends Error {
  public readonly line: number;

  constructor(message: string, line: number) {
    super(`[Line ${line}] ${message}`);
    this.name = 'VrdParserError';
    this.line = line;
  }
}