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
  server: ServerNode,
  database: DatabaseNode,
  db: DatabaseNode,
  cache: CacheNode,
  redis: CacheNode,
  gateway: GatewayNode,
  api: GatewayNode,
  service: ServiceNode,
  microservice: ServiceNode,
  user: UserNode,
  client: UserNode,
  queue: QueueNode,
  mq: QueueNode,
  cloud: CloudNode,
  cdn: CloudNode,
  storage: StorageNode,
  s3: StorageNode,
  blob: StorageNode,
  monitor: MonitorNode,
  metrics: MonitorNode,
  observability: MonitorNode,
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