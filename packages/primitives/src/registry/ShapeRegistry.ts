import type { ShapeDefinition } from '../shapes/ShapeDefinition';

export class InvalidShapeDefinitionError extends Error {
  constructor(name: string) {
    super(`InvalidShapeDefinitionError: shape '${name}' is missing required 'geometryFactory'.`);
    this.name = 'InvalidShapeDefinitionError';
  }
}

/**
 * Instance-scoped registry mapping shape name strings to ShapeDefinition objects.
 */
export class ShapeRegistry {
  private readonly _shapes = new Map<string, ShapeDefinition>();

  register(name: string, definition: ShapeDefinition): void {
    if (!definition.geometryFactory) {
      throw new InvalidShapeDefinitionError(name);
    }
    this._shapes.set(name, definition);
  }

  get(name: string): ShapeDefinition | undefined {
    return this._shapes.get(name);
  }

  list(): string[] {
    return Array.from(this._shapes.keys());
  }
}
