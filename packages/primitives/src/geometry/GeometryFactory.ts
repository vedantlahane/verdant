import * as THREE from 'three';
import type { ShapeRegistry } from '../registry/ShapeRegistry';
import type { SharedGeometryPool } from './SharedGeometryPool';

export class ShapeNotFoundError extends Error {
  constructor(shapeName: string) {
    super(
      `GeometryFactory: shape '${shapeName}' is not registered in the ShapeRegistry. ` +
        `Available shapes: use ShapeRegistry.list() to see registered names.`
    );
    this.name = 'ShapeNotFoundError';
  }
}

/**
 * Creates or retrieves a geometry from the SharedGeometryPool for a given
 * registered shape name. The pool key is deterministic:
 *   `"${shapeName}:${JSON.stringify(params ?? {})}"`
 *
 * Throws ShapeNotFoundError if the shape name is not in the registry.
 */
export function createGeometry(
  shapeName: string,
  pool: SharedGeometryPool,
  registry: ShapeRegistry,
  params?: Record<string, number>
): THREE.BufferGeometry {
  const definition = registry.get(shapeName);
  if (!definition) {
    throw new ShapeNotFoundError(shapeName);
  }

  const key = `${shapeName}:${JSON.stringify(params ?? {})}`;
  return pool.acquire(key, () => definition.geometryFactory(params));
}
