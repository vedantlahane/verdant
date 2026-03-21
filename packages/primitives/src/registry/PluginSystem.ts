import type React from 'react';
import type { VerdantPlugin } from '../provider/PrimitivesConfig';
import type { NodeRegistrationOptions } from './NodeRegistry';
import type { ShapeDefinition } from '../shapes/ShapeDefinition';
import { NodeRegistry } from './NodeRegistry';
import { ShapeRegistry } from './ShapeRegistry';
import type { ContextAction } from '../interaction/ContextMenu';

export class PluginConflictError extends Error {
  constructor(key: string, existingPlugin: string, newPlugin: string) {
    super(
      `Plugin conflict: node type '${key}' already registered by plugin '${existingPlugin}'. Attempted re-registration by '${newPlugin}'.`
    );
    this.name = 'PluginConflictError';
  }
}

export type { ContextAction };

export interface PluginRegistry {
  registerNode(
    type: string,
    component: React.ComponentType<any>,
    options?: NodeRegistrationOptions
  ): void;
  registerShape(name: string, definition: ShapeDefinition): void;
  registerContextAction(action: ContextAction): void;
}

/**
 * Instance-scoped plugin system.
 * Manages plugin installation and delegates registrations to NodeRegistry / ShapeRegistry.
 */
export class PluginSystem {
  private readonly _nodeRegistry: NodeRegistry;
  private readonly _shapeRegistry: ShapeRegistry;
  /** Maps node type key → plugin name that registered it */
  private readonly _nodeTypeOwners = new Map<string, string>();
  private readonly _plugins: Array<{ name: string; version: string }> = [];
  private _currentPlugin: string | null = null;
  private _contextActions: ContextAction[] = [];

  constructor(nodeRegistry: NodeRegistry, shapeRegistry: ShapeRegistry) {
    this._nodeRegistry = nodeRegistry;
    this._shapeRegistry = shapeRegistry;
  }

  install(plugin: VerdantPlugin): void {
    this._currentPlugin = plugin.name;

    const registry: PluginRegistry = {
      registerNode: (
        type: string,
        component: React.ComponentType<any>,
        options?: NodeRegistrationOptions
      ) => {
        const existing = this._nodeTypeOwners.get(type);
        if (existing !== undefined) {
          throw new PluginConflictError(type, existing, plugin.name);
        }
        this._nodeTypeOwners.set(type, plugin.name);
        this._nodeRegistry.register(type, component, options);
      },
      registerShape: (name: string, definition: ShapeDefinition) => {
        this._shapeRegistry.register(name, definition);
      },
      registerContextAction: (action: ContextAction) => {
        this._contextActions.push(action);
      },
    };

    plugin.install(registry);
    this._plugins.push({ name: plugin.name, version: plugin.version });
    this._currentPlugin = null;
  }

  listPlugins(): Array<{ name: string; version: string }> {
    return [...this._plugins];
  }

  registerContextAction(action: ContextAction): void {
    this._contextActions.push(action);
  }

  getContextActions(): ContextAction[] {
    return [...this._contextActions];
  }
}
