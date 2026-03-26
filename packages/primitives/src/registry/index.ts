// primitives/src/registry — node, shape, and plugin registries

export { NodeRegistry } from './NodeRegistry';
export type { NodeRegistrationOptions } from './NodeRegistry';

export { ShapeRegistry, InvalidShapeDefinitionError } from './ShapeRegistry';

export { PluginSystem, PluginConflictError } from './PluginSystem';
export type { ContextAction } from './PluginSystem';
