// parser/constants.ts — Validation sets, known node types, and shape hints

// ── Node type categories ──

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

function flattenCategories(): readonly string[] {
  const all: string[] = [];
  for (const entries of Object.values(NODE_TYPE_CATEGORIES)) {
    for (const t of entries) all.push(t);
  }
  return Object.freeze(all);
}

export const KNOWN_NODE_TYPES: readonly string[] = flattenCategories();
export const KNOWN_NODE_TYPES_SET: ReadonlySet<string> = new Set(KNOWN_NODE_TYPES);

// ── Validation sets ──

export const VALID_LAYOUTS: ReadonlySet<string> = new Set([
  'auto', 'grid', 'circular', 'hierarchical', 'forced',
]);

export const VALID_SHAPES: ReadonlySet<string> = new Set([
  'cube', 'cylinder', 'diamond', 'sphere', 'torus',
  'hexagon', 'pentagon', 'octagon', 'ring', 'box',
  'cone', 'capsule', 'icosahedron', 'plane',
]);

export const VALID_STATUSES: ReadonlySet<string> = new Set([
  'healthy', 'warning', 'error', 'unknown',
]);

export const VALID_ANIMATION_TYPES: ReadonlySet<string> = new Set([
  'fade', 'scale', 'slide',
]);

export const VALID_ROUTING_TYPES: ReadonlySet<string> = new Set([
  'straight', 'curved', 'orthogonal',
]);

export const VALID_PORT_SIDES: ReadonlySet<string> = new Set([
  'top', 'bottom', 'left', 'right', 'front', 'back',
]);

export const VALID_BADGE_POSITIONS: ReadonlySet<string> = new Set([
  'top-right', 'top-left', 'bottom-right', 'bottom-left',
]);

export const VALID_CAMERAS: ReadonlySet<string> = new Set([
  'perspective', 'orthographic',
]);

export const VALID_SIZES: ReadonlySet<string> = new Set([
  'xs', 'sm', 'md', 'lg', 'xl',
]);

export const VALID_EDGE_STYLES: ReadonlySet<string> = new Set([
  'solid', 'dashed', 'animated', 'dotted',
]);

export const KNOWN_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'theme', 'layout', 'camera', 'pack', 'title', 'description',
  'minimap', 'post-processing', 'bloom-intensity', 'snap-to-grid',
  'grid-size', 'direction', 'layer-spacing', 'node-spacing',
]);

export const KNOWN_NODE_PROPS: ReadonlySet<string> = new Set([
  'label', 'color', 'size', 'glow', 'icon', 'position',
  'description', 'status', 'opacity', 'scale', 'shape',
  'enter', 'exit', 'animation-duration',
]);

export const KNOWN_EDGE_PROPS: ReadonlySet<string> = new Set([
  'label', 'style', 'color', 'width', 'bidirectional',
  'fromPort', 'toPort', 'description',
  'routing', 'flow', 'flow-speed', 'flow-count', 'flow-color',
]);

// ── Shape mapping hints ──

export const NODE_TYPE_SHAPE_HINTS: Readonly<Record<string, string>> = Object.freeze({
  server: 'cube', service: 'cube', microservice: 'cube', worker: 'cube',
  task: 'cube', instance: 'cube', process: 'cube', build: 'cube',
  deploy: 'cube', config: 'cube', plugin: 'cube',
  function: 'pentagon', lambda: 'pentagon', webhook: 'pentagon',
  cron: 'pentagon', scheduler: 'pentagon',
  database: 'cylinder', storage: 'cylinder', bucket: 'cylinder',
  datalake: 'cylinder', warehouse: 'cylinder', filesystem: 'cylinder',
  volume: 'cylinder', table: 'cylinder', datastore: 'cylinder',
  repository: 'cylinder', artifact: 'cylinder',
  gateway: 'diamond', api: 'diamond', endpoint: 'diamond',
  loadbalancer: 'diamond', proxy: 'diamond', ingress: 'diamond',
  queue: 'torus', topic: 'torus', stream: 'torus', bus: 'torus',
  broker: 'torus', pubsub: 'torus', event: 'torus',
  user: 'sphere', client: 'sphere', browser: 'sphere', mobile: 'sphere',
  desktop: 'sphere', device: 'sphere', iot: 'sphere', app: 'sphere',
  cloud: 'sphere',
  cache: 'hexagon', monitor: 'hexagon', metric: 'hexagon',
  dashboard: 'hexagon', logger: 'hexagon', tracer: 'hexagon',
  alerter: 'hexagon',
  auth: 'octagon', vault: 'octagon', waf: 'octagon',
  certificate: 'octagon', identity: 'octagon', secret: 'octagon',
  kms: 'octagon', sso: 'octagon', firewall: 'octagon',
  cdn: 'ring', dns: 'ring', router: 'ring', switch: 'ring',
  mesh: 'ring', sidecar: 'ring', vpc: 'ring', subnet: 'ring',
  cluster: 'ring', namespace: 'ring', network: 'ring',
  region: 'ring', zone: 'ring',
  container: 'box', pod: 'box', vm: 'box',
  pipeline: 'box', registry: 'box',
});
