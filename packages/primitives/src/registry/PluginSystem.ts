// primitives/src/registry/PluginSystem.ts

import type { VerdantPlugin, PluginRegistryAPI } from '../provider/PrimitivesConfig';
import type { NodeRegistrationOptions } from './NodeRegistry';
import type { ShapeDefinition } from '../shapes/ShapeDefinition';
import { NodeRegistry } from './NodeRegistry';
import { ShapeRegistry } from './ShapeRegistry';

// ── Errors ──────────────────────────────────────────────────

export class PluginConflictError extends Error {
  constructor(
    public readonly resourceType: 'node' | 'shape',
    public readonly key: string,
    public readonly existingPlugin: string,
    public readonly newPlugin: string,
  ) {
    super(
      `[PluginSystem] Conflict: ${resourceType} type "${key}" already registered ` +
      `by plugin "${existingPlugin}". Attempted re-registration by "${newPlugin}".`,
    );
    this.name = 'PluginConflictError';
  }
}

// ── Context Action type (defined here to avoid circular dep with ContextMenu) ──

export interface ContextAction {
  id: string;
  label: string;
  /** Which element types this action applies to. */
  appliesTo: Array<'node' | 'edge' | 'group' | 'canvas'>;
  /** Icon identifier (optional). */
  icon?: string;
  /** Keyboard shortcut hint (display only). */
  shortcut?: string;
  /** Handler called when the action is selected. */
  handler: (context: { targetId?: string; targetType?: string }) => void;
}

// ── Plugin Info ─────────────────────────────────────────────

interface InstalledPlugin {
  name: string;
  version: string;
}

/**
 * Instance-scoped plugin system.
 *
 * Manages plugin installation and delegates registrations to
 * `NodeRegistry` and `ShapeRegistry` with conflict detection.
 */
export class PluginSystem {
  private readonly _nodeRegistry: NodeRegistry;
  private readonly _shapeRegistry: ShapeRegistry;

  /** Maps resource key → plugin name that registered it. */
  private readonly _nodeTypeOwners = new Map<string, string>();
  private readonly _shapeOwners = new Map<string, string>();

  private readonly _plugins: InstalledPlugin[] = [];
  private readonly _contextActions: ContextAction[] = [];

  constructor(nodeRegistry: NodeRegistry, shapeRegistry: ShapeRegistry) {
    this._nodeRegistry = nodeRegistry;
    this._shapeRegistry = shapeRegistry;
  }

  /**
   * Install a plugin. The plugin's `install()` method receives a registry API
   * for registering nodes, shapes, and context actions.
   *
   * @throws {PluginConflictError} if a node type or shape name is already owned by another plugin.
   * @throws {Error} if a plugin with the same name is already installed.
   */
  install(plugin: VerdantPlugin): void {
    if (this.isInstalled(plugin.name)) {
      throw new Error(
        `[PluginSystem] Plugin "${plugin.name}" is already installed.`,
      );
    }

    const pluginName = plugin.name;

    const registry: PluginRegistryAPI = {
      registerNode: (
        type: string,
        component: React.ComponentType<any>,
        options?: NodeRegistrationOptions,
      ) => {
        const existing = this._nodeTypeOwners.get(type);
        if (existing !== undefined && existing !== pluginName) {
          throw new PluginConflictError('node', type, existing, pluginName);
        }
        this._nodeTypeOwners.set(type, pluginName);
        this._nodeRegistry.register(type, component, options);
      },

      registerShape: (name: string, definition: ShapeDefinition) => {
        const existing = this._shapeOwners.get(name);
        if (existing !== undefined && existing !== pluginName) {
          throw new PluginConflictError('shape', name, existing, pluginName);
        }
        this._shapeOwners.set(name, pluginName);
        this._shapeRegistry.register(name, definition);
      },

      registerContextAction: (action: ContextAction) => {
        this._contextActions.push({ ...action });
      },
    };

    plugin.install(registry);
    this._plugins.push({ name: plugin.name, version: plugin.version });
  }

  /** Check if a plugin with the given name is already installed. */
  isInstalled(name: string): boolean {
    return this._plugins.some((p) => p.name === name);
  }

  /** List all installed plugins (defensive copy). */
  listPlugins(): InstalledPlugin[] {
    return [...this._plugins];
  }

  /** Register a context action outside of plugin installation. */
  registerContextAction(action: ContextAction): void {
    this._contextActions.push({ ...action });
  }

  /** Get all registered context actions (defensive copy). */
  getContextActions(): ContextAction[] {
    return [...this._contextActions];
  }

  /** Get context actions that apply to a specific element type. */
  getActionsFor(elementType: 'node' | 'edge' | 'group' | 'canvas'): ContextAction[] {
    return this._contextActions.filter((a) => a.appliesTo.includes(elementType));
  }
}