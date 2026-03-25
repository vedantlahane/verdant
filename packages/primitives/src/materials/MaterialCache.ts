// primitives/src/materials/MaterialCache.ts

import { Color, Material, MeshBasicMaterial, MeshStandardMaterial, MeshStandardMaterialParameters } from 'three';

export interface MaterialConfig {
  color: string;
  opacity?: number;
  transparent?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  /** Material class to use. @default "MeshStandardMaterial" */
  type?: 'MeshStandardMaterial' | 'MeshBasicMaterial';
}

export interface MaterialCacheStats {
  cachedCount: number;
  totalReferenceCount: number;
}

interface CacheEntry {
  material: Material;
  refCount: number;
}

/**
 * Derives a deterministic cache key from a `MaterialConfig` by
 * JSON-serializing with sorted keys.
 */
function materialKey(config: MaterialConfig): string {
  const keys = Object.keys(config).sort() as (keyof MaterialConfig)[];
  const sorted: Record<string, unknown> = {};
  for (const k of keys) {
    if (config[k] !== undefined) sorted[k] = config[k];
  }
  return JSON.stringify(sorted);
}

/**
 * Reference-counted cache for Three.js material instances.
 *
 * **All material lifecycle (`dispose`) is managed exclusively by this cache.**
 * Consumers must NEVER call `.dispose()` directly on acquired materials.
 */
export class MaterialCache {
  private readonly _store = new Map<string, CacheEntry>();

  /**
   * Acquire a material for the given config.
   *
   * - If an identical config exists: increments `refCount`, returns cached.
   * - Otherwise: creates a new material, caches with `refCount = 1`.
   */
  acquire(config: MaterialConfig): Material {
    const key = materialKey(config);
    const entry = this._store.get(key);
    if (entry) {
      entry.refCount++;
      return entry.material;
    }

    const material = this._createMaterial(config);
    this._store.set(key, { material, refCount: 1 });
    return material;
  }

  /**
   * Release a material for the given config.
   *
   * - Decrements `refCount`.
   * - At `refCount === 0`: calls `material.dispose()` and removes from cache.
   *
   * @returns `true` if the entry was found and decremented.
   */
  release(config: MaterialConfig): boolean {
    const key = materialKey(config);
    const entry = this._store.get(key);
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[MaterialCache] Attempted to release unknown config. ` +
          `Key: "${key}". This usually means a double-release.`,
        );
      }
      return false;
    }

    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.material.dispose();
      this._store.delete(key);
    }
    return true;
  }

  /** Check whether a config key exists in the cache. */
  has(config: MaterialConfig): boolean {
    return this._store.has(materialKey(config));
  }

  /** Get reference count for a config, or 0 if not found. */
  getRefCount(config: MaterialConfig): number {
    return this._store.get(materialKey(config))?.refCount ?? 0;
  }

  /** Returns current cache statistics. */
  getStats(): MaterialCacheStats {
    let totalReferenceCount = 0;
    for (const entry of this._store.values()) {
      totalReferenceCount += entry.refCount;
    }
    return {
      cachedCount: this._store.size,
      totalReferenceCount,
    };
  }

  /** Disposes all cached materials and clears the store. */
  dispose(): void {
    for (const entry of this._store.values()) {
      entry.material.dispose();
    }
    this._store.clear();
  }

  // ── Private ─────────────────────────────────────────────

  private _createMaterial(config: MaterialConfig): Material {
    const isBasic = config.type === 'MeshBasicMaterial';

    if (isBasic) {
      return new MeshBasicMaterial({
        color: config.color,
        opacity: config.opacity,
        transparent: config.transparent ?? (config.opacity !== undefined && config.opacity < 1),
      });
    }

    const params: MeshStandardMaterialParameters = {
      color: config.color,
    };

    if (config.opacity !== undefined) {
      params.opacity = config.opacity;
      params.transparent = config.transparent ?? config.opacity < 1;
    }
    if (config.emissive !== undefined) {
      params.emissive = new Color(config.emissive);
    }
    if (config.emissiveIntensity !== undefined) {
      params.emissiveIntensity = config.emissiveIntensity;
    }
    if (config.metalness !== undefined) {
      params.metalness = config.metalness;
    }
    if (config.roughness !== undefined) {
      params.roughness = config.roughness;
    }

    return new MeshStandardMaterial(params);
  }
}