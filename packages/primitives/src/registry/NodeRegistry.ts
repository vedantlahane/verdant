import type React from 'react';

export interface NodeRegistrationOptions {
  displayName?: string;
  description?: string;
}

/**
 * Instance-scoped registry mapping node type strings to React components.
 * Replaces the module-singleton NodeRegistry from src/NodeRegistry.ts.
 */
export class NodeRegistry {
  private readonly _nodes = new Map<string, React.ComponentType<any>>();
  private readonly _options = new Map<string, NodeRegistrationOptions>();

  register(
    type: string,
    component: React.ComponentType<any>,
    options?: NodeRegistrationOptions
  ): void {
    this._nodes.set(type, component);
    if (options) {
      this._options.set(type, options);
    }
  }

  get(type: string): React.ComponentType<any> | undefined {
    return this._nodes.get(type);
  }

  list(): string[] {
    return Array.from(this._nodes.keys());
  }
}
