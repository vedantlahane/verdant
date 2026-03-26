import { NodeRegistry } from '@verdant/primitives';
import { VerdantNode } from './VerdantNode';
import { NODE_TYPE_DEFAULTS } from './nodeDefaults';

export const nodeRegistry = new NodeRegistry();

// Register all built-in node types automatically
Object.keys(NODE_TYPE_DEFAULTS).forEach((type) => {
  nodeRegistry.register(type, VerdantNode);
});
