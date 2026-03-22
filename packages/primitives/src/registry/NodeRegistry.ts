// primitives/src/registry/NodeRegistry.ts

import type { ComponentType } from 'react';

export interface NodeRegistrationOptions {
  displayName?: string;
  description?: string;
  /** Default shape key from ShapeRegistry. */
  defaultShape?: string;
  /** Default color hex string. */
  defaultColor?: string;
}

interface RegistryEntry {
  component: ComponentType<any>;
  options: NodeRegistrationOptions;
}

/**
 * Instance-scoped registry mapping node type strings to React components.
 *
 * Each `PrimitivesProvider` creates its own `NodeRegistry`, so registrations
 * are isolated per provider tree (SSR-safe, HMR-safe).
 */
export class NodeRegistry {
  private readonly _entries = new Map<string, RegistryEntry>();

  /** Register a node type. Overwrites if the same key already exists. */
  register(
    type: string,
    component: ComponentType<any>,
    options: NodeRegistrationOptions = {},
  ): void {
    this._entries.set(type, { component, options });
  }

  /** Remove a registered node type. Returns `true` if it existed. */
  unregister(type: string): boolean {
    return this._entries.delete(type);
  }

  /** Get the component for a node type, or `undefined` if not registered. */
  get(type: string): ComponentType<any> | undefined {
    return this._entries.get(type)?.component;
  }

  /** Get registration options for a node type. */
  getOptions(type: string): NodeRegistrationOptions | undefined {
    return this._entries.get(type)?.options;
  }

  /** Check whether a node type is registered. */
  has(type: string): boolean {
    return this._entries.has(type);
  }

  /** List all registered type keys. */
  list(): string[] {
    return Array.from(this._entries.keys());
  }

  /** Number of registered types. */
  get size(): number {
    return this._entries.size;
  }

  /** Remove all registrations. */
  clear(): void {
    this._entries.clear();
  }

  /** Iterate over all entries as `[type, component]` pairs. */
  *[Symbol.iterator](): IterableIterator<[string, ComponentType<any>]> {
    for (const [key, entry] of this._entries) {
      yield [key, entry.component];
    }
  }
}