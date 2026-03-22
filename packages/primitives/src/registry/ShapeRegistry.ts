// primitives/src/registry/ShapeRegistry.ts

import type { ShapeDefinition } from '../shapes/ShapeDefinition';

export class InvalidShapeDefinitionError extends Error {
  constructor(name: string, reason: string) {
    super(
      `[ShapeRegistry] Cannot register shape "${name}": ${reason}.`,
    );
    this.name = 'InvalidShapeDefinitionError';
  }
}

/**
 * Instance-scoped registry mapping shape name strings to `ShapeDefinition` objects.
 *
 * Each `PrimitivesProvider` creates its own `ShapeRegistry`, ensuring isolation.
 */
export class ShapeRegistry {
  private readonly _shapes = new Map<string, ShapeDefinition>();

  /**
   * Register a shape definition. Overwrites if the same name already exists.
   * @throws {InvalidShapeDefinitionError} if `geometryFactory` is missing.
   */
  register(name: string, definition: ShapeDefinition): void {
    if (!definition) {
      throw new InvalidShapeDefinitionError(name, 'definition is null/undefined');
    }
    if (typeof definition.geometryFactory !== 'function') {
      throw new InvalidShapeDefinitionError(
        name,
        `"geometryFactory" must be a function, got ${typeof definition.geometryFactory}`,
      );
    }
    this._shapes.set(name, definition);
  }

  /** Remove a registered shape. Returns `true` if it existed. */
  unregister(name: string): boolean {
    return this._shapes.delete(name);
  }

  /** Get a shape definition, or `undefined` if not registered. */
  get(name: string): ShapeDefinition | undefined {
    return this._shapes.get(name);
  }

  /** Check whether a shape name is registered. */
  has(name: string): boolean {
    return this._shapes.has(name);
  }

  /** List all registered shape names. */
  list(): string[] {
    return Array.from(this._shapes.keys());
  }

  /** Number of registered shapes. */
  get size(): number {
    return this._shapes.size;
  }

  /** Remove all registrations. */
  clear(): void {
    this._shapes.clear();
  }

  /** Iterate over all entries as `[name, definition]` pairs. */
  *[Symbol.iterator](): IterableIterator<[string, ShapeDefinition]> {
    yield* this._shapes;
  }
}