// nodes/nodeMap.ts

import type { ComponentType } from 'react';
import type { NodeProps } from '@verdant/primitives';
import {
  ServerNode,
  DatabaseNode,
  CacheNode,
  GatewayNode,
  ServiceNode,
  UserNode,
  QueueNode,
  CloudNode,
  StorageNode,
  MonitorNode,
} from '@verdant/nodes';

// ═══════════════════════════════════════════════════════════════════
//  Node Type Registry
//
//  Maps VRD node type strings (lowercase) to React components.
//
//  Usage:
//    const Component = getNodeComponent(node.type);
//    <Component {...props} />
//
//  Design decisions:
//  - Keys are lowercase to normalize user input (VRD files may
//    use "Server", "SERVER", or "server")
//  - Registry is frozen to prevent runtime mutation
//  - Aliases (e.g., "client" → UserNode) are explicit entries
//    rather than runtime fallback logic
//  - FALLBACK_NODE is used for unknown types rather than throwing,
//    so diagrams with custom/future node types still render
// ═══════════════════════════════════════════════════════════════════

const NODE_REGISTRY: Readonly<Record<string, ComponentType<NodeProps>>> = Object.freeze({
  // --- Compute ---
  server: ServerNode,
  service: ServiceNode,
  microservice: ServiceNode,
  function: ServerNode, // Fallback to service-like if no specific component
  lambda: ServerNode,
  container: ServerNode,
  pod: ServerNode,
  worker: ServerNode,
  vm: ServerNode,
  task: ServerNode,
  instance: ServerNode,
  process: ServerNode,

  // --- Storage ---
  database: DatabaseNode,
  db: DatabaseNode,
  cache: CacheNode,
  redis: CacheNode,
  storage: StorageNode,
  bucket: StorageNode,
  datalake: StorageNode,
  warehouse: StorageNode,
  filesystem: StorageNode,
  volume: StorageNode,
  table: StorageNode,
  datastore: StorageNode,

  // --- Network ---
  gateway: GatewayNode,
  api: GatewayNode,
  loadbalancer: GatewayNode,
  proxy: GatewayNode,
  firewall: GatewayNode,
  cdn: CloudNode,
  dns: CloudNode,
  router: CloudNode,
  switch: CloudNode,
  endpoint: GatewayNode,
  ingress: GatewayNode,

  // --- Messaging ---
  queue: QueueNode,
  mq: QueueNode,
  topic: QueueNode,
  stream: QueueNode,
  bus: QueueNode,
  broker: QueueNode,
  pubsub: QueueNode,
  event: QueueNode,

  // --- Cloud Infrastructure ---
  cloud: CloudNode,
  region: CloudNode,
  zone: CloudNode,
  vpc: CloudNode,
  subnet: CloudNode,
  cluster: CloudNode,
  namespace: CloudNode,
  network: CloudNode,

  // --- Clients ---
  user: UserNode,
  client: UserNode,
  browser: UserNode,
  mobile: UserNode,
  iot: UserNode,
  device: UserNode,
  desktop: UserNode,
  app: UserNode,

  // --- Observability ---
  monitor: MonitorNode,
  metrics: MonitorNode,
  observability: MonitorNode,
  logger: MonitorNode,
  tracer: MonitorNode,
  alerter: MonitorNode,
  dashboard: MonitorNode,
  metric: MonitorNode,

  // --- Security ---
  auth: GatewayNode,
  vault: GatewayNode,
  waf: GatewayNode,
  certificate: GatewayNode,
  identity: GatewayNode,
  secret: GatewayNode,
  kms: GatewayNode,
  sso: GatewayNode,

  // --- CI/CD ---
  pipeline: ServerNode,
  registry: StorageNode,
  artifact: StorageNode,
  build: ServerNode,
  deploy: ServerNode,
  repository: StorageNode,

  // --- Generic ---
  webhook: ServerNode,
  cron: ServerNode,
  scheduler: ServerNode,
  config: ServerNode,
  mesh: CloudNode,
  sidecar: CloudNode,
  plugin: ServerNode,
});

/**
 * Fallback component for unknown node types.
 * ServerNode provides a generic "box with label" appearance
 * that works for any node type.
 */
export const FALLBACK_NODE: ComponentType<NodeProps> = ServerNode;

/**
 * Look up the React component for a given VRD node type.
 *
 * @param type - Node type string from the VRD AST (case-insensitive)
 * @returns The matching component, or FALLBACK_NODE if unknown
 *
 * @example
 * ```tsx
 * const Component = getNodeComponent(node.type);
 * <Component label={node.id} position={pos} color={color} />
 * ```
 */
export function getNodeComponent(type: string): ComponentType<NodeProps> {
  return NODE_REGISTRY[type.toLowerCase()] ?? FALLBACK_NODE;
}

/**
 * Check whether a node type has a dedicated component.
 * Useful for diagnostics/validation (e.g., warning about unknown types).
 */
export function isKnownNodeType(type: string): boolean {
  return type.toLowerCase() in NODE_REGISTRY;
}

/**
 * Get all registered node type names (lowercase).
 * Useful for autocomplete/validation in the editor.
 */
export function getRegisteredNodeTypes(): readonly string[] {
  return Object.keys(NODE_REGISTRY);
}

// ═══════════════════════════════════════════════════════════════════
//  Backward Compatibility
//
//  The original codebase accessed NODE_MAP directly with bracket
//  notation. Prefer `getNodeComponent()` for new code — it handles
//  case normalization and fallback in one call.
// ═══════════════════════════════════════════════════════════════════

/** @deprecated Use `getNodeComponent(type)` instead */
export const NODE_MAP = NODE_REGISTRY;