// primitives/src/geometry/GeometryFactory.ts

import { BoxGeometry, BufferGeometry, Group, Mesh, Object3D } from 'three';
import type { ShapeRegistry } from '../registry/ShapeRegistry';
import type { SharedGeometryPool } from './SharedGeometryPool';

// ── Errors ──────────────────────────────────────────────────

export class ShapeNotFoundError extends Error {
  constructor(shapeName: string, available: string[]) {
    super(
      `[GeometryFactory] Shape "${shapeName}" is not registered. ` +
      `Available: [${available.join(', ')}]`,
    );
    this.name = 'ShapeNotFoundError';
  }
}

// ── Pool Key ────────────────────────────────────────────────

/** Deterministic pool key for a shape + params combination. */
function poolKey(shapeName: string, params?: Record<string, number>): string {
  if (!params || Object.keys(params).length === 0) return `${shapeName}:{}`;
  // Sort keys for deterministic ordering
  const sorted = Object.keys(params).sort().reduce<Record<string, number>>((acc, k) => {
    acc[k] = params[k];
    return acc;
  }, {});
  return `${shapeName}:${JSON.stringify(sorted)}`;
}

// ── Factory ─────────────────────────────────────────────────

/**
 * Creates or retrieves geometry from the `SharedGeometryPool` for a
 * registered shape name.
 *
 * @throws {ShapeNotFoundError} if the shape is not in the registry.
 */
export function createGeometry(
  shapeName: string,
  pool: SharedGeometryPool,
  registry: ShapeRegistry,
  params?: Record<string, number>,
): BufferGeometry {
  const definition = registry.get(shapeName);
  if (!definition) {
    throw new ShapeNotFoundError(shapeName, registry.list());
  }

  const key = poolKey(shapeName, params);
  return pool.acquire(key, () => definition.geometryFactory(params));
}

/**
 * Release geometry back to the pool. Must be called when a node using
 * this geometry unmounts.
 */
export function releaseGeometry(
  shapeName: string,
  pool: SharedGeometryPool,
  params?: Record<string, number>,
): void {
  const key = poolKey(shapeName, params);
  pool.release(key);
}

// ── GLTF Custom Shape Loader ────────────────────────────────

/**
 * Duck-typed structural interface for a GLTF loader.
 * Matches the signature of `GLTFLoader` without importing it,
 * so it can be injected in tests.
 */
export interface GLTFLoaderInterface {
  load(
    url: string,
    onLoad: (gltf: { scene: Group }) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void;
}

/**
 * Recursively finds the first Mesh in a Three.js object graph.
 */
function findFirstMesh(object: Object3D): Mesh | null {
  if ((object as Mesh).isMesh) {
    return object as Mesh;
  }
  for (const child of object.children) {
    const found = findFirstMesh(child);
    if (found) return found;
  }
  return null;
}

/**
 * Loads a GLTF file, extracts the first mesh geometry, registers it in the
 * `ShapeRegistry`, and returns the geometry from the pool.
 *
 * **Fallback behavior** (with `console.error`):
 * - Loader failure → box geometry
 * - No mesh found → box geometry
 * - `box` shape not registered → creates a plain `BoxGeometry(1,1,1)`
 *
 * @param gltfUrl - URL to load. Also used as the shape name in the registry.
 */
export async function loadCustomShape(
  gltfUrl: string,
  pool: SharedGeometryPool,
  registry: ShapeRegistry,
  loader: GLTFLoaderInterface,
): Promise<BufferGeometry> {
  // Already registered? Return from pool.
  const existing = registry.get(gltfUrl);
  if (existing) {
    return pool.acquire(poolKey(gltfUrl), () => existing.geometryFactory());
  }

  return new Promise<BufferGeometry>((resolve) => {
    loader.load(
      gltfUrl,
      (gltf) => {
        try {
          const mesh = findFirstMesh(gltf.scene);

          if (!mesh || !(mesh.geometry instanceof BufferGeometry)) {
            console.error(
              `[GeometryFactory] No mesh found in GLTF at "${gltfUrl}". Falling back to box.`,
            );
            resolve(fallbackBox(gltfUrl, pool, registry));
            return;
          }

          const geo = mesh.geometry.clone(); // Clone so GLTF scene can be freed

          // Register for future use
          registry.register(gltfUrl, {
            name: gltfUrl,
            geometryFactory: () => geo,
            defaultPorts: [],
            defaultMaterialConfig: { color: '#888888' },
          });

          resolve(pool.acquire(poolKey(gltfUrl), () => geo));
        } catch (err) {
          console.error(
            `[GeometryFactory] Error processing GLTF at "${gltfUrl}":`,
            err,
          );
          resolve(fallbackBox(gltfUrl, pool, registry));
        }
      },
      undefined,
      (error) => {
        console.error(
          `[GeometryFactory] Failed to load GLTF at "${gltfUrl}":`,
          error,
        );
        resolve(fallbackBox(gltfUrl, pool, registry));
      },
    );
  });
}

/** Returns box geometry from registry or creates a fallback. */
function fallbackBox(
  sourceKey: string,
  pool: SharedGeometryPool,
  registry: ShapeRegistry,
): BufferGeometry {
  const boxDef = registry.get('box');
  if (boxDef) {
    return pool.acquire(poolKey('box'), () => boxDef.geometryFactory());
  }
  return pool.acquire(`${sourceKey}:fallback-box`, () => new BoxGeometry(1, 1, 1));
}

export const GeometryFactory = {
  createGeometry,
  releaseGeometry,
  loadCustomShape,
};