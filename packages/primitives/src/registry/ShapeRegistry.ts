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
   * Validates geometryFactory and defaultPorts structure.
   * @throws {InvalidShapeDefinitionError} if validation fails.
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

    // ── Validate defaultPorts ──
    if (definition.defaultPorts !== undefined) {
      if (!Array.isArray(definition.defaultPorts)) {
        throw new InvalidShapeDefinitionError(
          name,
          `"defaultPorts" must be an array or undefined, got ${typeof definition.defaultPorts}`,
        );
      }

      for (let i = 0; i < definition.defaultPorts.length; i++) {
        const port = definition.defaultPorts[i];

        if (!port) {
          throw new InvalidShapeDefinitionError(
            name,
            `defaultPorts[${i}] is null/undefined`,
          );
        }

        // Check required properties
        if (typeof port.name !== 'string' || port.name.length === 0) {
          throw new InvalidShapeDefinitionError(
            name,
            `defaultPorts[${i}].name must be a non-empty string, got ${typeof port.name}`,
          );
        }

        if (!port.localPosition) {
          throw new InvalidShapeDefinitionError(
            name,
            `defaultPorts[${i}].localPosition is required`,
          );
        }

        if (
          !Number.isFinite(port.localPosition.x) ||
          !Number.isFinite(port.localPosition.y) ||
          !Number.isFinite(port.localPosition.z)
        ) {
          throw new InvalidShapeDefinitionError(
            name,
            `defaultPorts[${i}].localPosition coordinates must be finite numbers`,
          );
        }

        if (!port.facingDirection) {
          throw new InvalidShapeDefinitionError(
            name,
            `defaultPorts[${i}].facingDirection is required`,
          );
        }
      }
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