// packages/nodes/src/nodeDefaults.ts

export const NODE_TYPE_DEFAULTS: Record<string, { shape: string; color?: string }> = {
  // --- Compute ---
  server: { shape: 'cube' },
  service: { shape: 'cube' },
  microservice: { shape: 'cube' },
  function: { shape: 'pentagon' },
  lambda: { shape: 'pentagon' },
  container: { shape: 'box' },
  pod: { shape: 'box' },
  worker: { shape: 'cube' },
  vm: { shape: 'box' },
  task: { shape: 'cube' },
  instance: { shape: 'cube' },
  process: { shape: 'cube' },

  // --- Storage ---
  database: { shape: 'cylinder' },
  cache: { shape: 'hexagon' },
  storage: { shape: 'cylinder' },
  bucket: { shape: 'cylinder' },
  datalake: { shape: 'cylinder' },
  warehouse: { shape: 'cylinder' },
  filesystem: { shape: 'cylinder' },
  volume: { shape: 'cylinder' },
  table: { shape: 'cylinder' },
  datastore: { shape: 'cylinder' },

  // --- Network ---
  gateway: { shape: 'diamond' },
  loadbalancer: { shape: 'diamond' },
  proxy: { shape: 'diamond' },
  firewall: { shape: 'octagon' },
  cdn: { shape: 'ring' },
  dns: { shape: 'ring' },
  router: { shape: 'ring' },
  switch: { shape: 'ring' },
  api: { shape: 'diamond' },
  endpoint: { shape: 'diamond' },
  ingress: { shape: 'diamond' },

  // --- Messaging ---
  queue: { shape: 'torus' },
  topic: { shape: 'torus' },
  stream: { shape: 'torus' },
  bus: { shape: 'torus' },
  broker: { shape: 'torus' },
  pubsub: { shape: 'torus' },
  event: { shape: 'torus' },

  // --- Cloud Infrastructure ---
  cloud: { shape: 'sphere' },
  region: { shape: 'ring' },
  zone: { shape: 'ring' },
  vpc: { shape: 'ring' },
  subnet: { shape: 'ring' },
  cluster: { shape: 'ring' },
  namespace: { shape: 'ring' },
  network: { shape: 'ring' },

  // --- Clients ---
  user: { shape: 'sphere' },
  client: { shape: 'sphere' },
  browser: { shape: 'sphere' },
  mobile: { shape: 'sphere' },
  iot: { shape: 'sphere' },
  device: { shape: 'sphere' },
  desktop: { shape: 'sphere' },
  app: { shape: 'sphere' },

  // --- Observability ---
  monitor: { shape: 'hexagon' },
  logger: { shape: 'hexagon' },
  tracer: { shape: 'hexagon' },
  alerter: { shape: 'hexagon' },
  dashboard: { shape: 'hexagon' },
  metric: { shape: 'hexagon' },

  // --- Security ---
  auth: { shape: 'octagon' },
  vault: { shape: 'octagon' },
  waf: { shape: 'octagon' },
  certificate: { shape: 'octagon' },
  identity: { shape: 'octagon' },
  secret: { shape: 'octagon' },
  kms: { shape: 'octagon' },
  sso: { shape: 'octagon' },

  // --- CI/CD ---
  pipeline: { shape: 'box' },
  registry: { shape: 'box' },
  artifact: { shape: 'cylinder' },
  build: { shape: 'cube' },
  deploy: { shape: 'cube' },
  repository: { shape: 'cylinder' },

  // --- Generic ---
  webhook: { shape: 'pentagon' },
  cron: { shape: 'pentagon' },
  scheduler: { shape: 'pentagon' },
  config: { shape: 'cube' },
  mesh: { shape: 'ring' },
  sidecar: { shape: 'ring' },
  plugin: { shape: 'cube' },
};
