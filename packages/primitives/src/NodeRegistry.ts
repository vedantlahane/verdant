/**
 * @deprecated Use the class-based NodeRegistry from './registry/NodeRegistry' instead.
 * This module-singleton is kept for backward compatibility only.
 */
import React from 'react';
export { NodeRegistry } from './registry/NodeRegistry';
export type { NodeRegistrationOptions } from './registry/NodeRegistry';

// Legacy module-singleton instance (v1 API)
type NodeComponent = React.ComponentType<any>;
const registry = new Map<string, NodeComponent>();

export const nodeRegistrySingleton = {
  register: (key: string, comp: NodeComponent) => {
    registry.set(key, comp);
  },
  get: (key: string) => registry.get(key),
  list: () => Array.from(registry.keys()),
};
