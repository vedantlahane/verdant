import * as THREE from 'three';

export interface MaterialConfig {
  color: string;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
}

interface CacheEntry {
  material: THREE.Material;
  refCount: number;
}

/**
 * Derives a deterministic cache key from a MaterialConfig by JSON-serializing
 * with sorted keys, ensuring config objects with the same properties in any
 * order produce the same key.
 */
function materialKey(config: MaterialConfig): string {
  return JSON.stringify(config, Object.keys(config).sort() as (keyof MaterialConfig)[]);
}

/**
 * Reference-counted cache for Three.js material instances.
 * All material lifecycle (dispose) is managed exclusively by this cache —
 * consumers must never call .dispose() directly on acquired materials.
 */
export class MaterialCache {
  private readonly store = new Map<string, CacheEntry>();

  /**
   * Acquire a material for the given config. If a material with identical
   * parameters already exists, increments its refCount and returns the cached
   * instance. Otherwise creates a new MeshStandardMaterial and stores it with
   * refCount 1.
   */
  acquire(config: MaterialConfig): THREE.Material {
    const key = materialKey(config);
    const entry = this.store.get(key);
    if (entry) {
      entry.refCount++;
      return entry.material;
    }

    const params: THREE.MeshStandardMaterialParameters = {
      color: config.color,
    };
    if (config.opacity !== undefined) {
      params.opacity = config.opacity;
      params.transparent = config.opacity < 1;
    }
    if (config.emissive !== undefined) {
      params.emissive = new THREE.Color(config.emissive);
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

    const material = new THREE.MeshStandardMaterial(params);
    this.store.set(key, { material, refCount: 1 });
    return material;
  }

  /**
   * Release a material for the given config. Decrements refCount; when it
   * reaches 0, calls material.dispose() and removes the entry from the cache.
   * Releasing an unknown config is a no-op with a console.warn.
   */
  release(config: MaterialConfig): void {
    const key = materialKey(config);
    const entry = this.store.get(key);
    if (!entry) {
      console.warn(`MaterialCache: attempted to release unknown config key "${key}"`);
      return;
    }
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.material.dispose();
      this.store.delete(key);
    }
  }

  /**
   * Disposes all cached materials and clears the store.
   */
  dispose(): void {
    for (const entry of this.store.values()) {
      entry.material.dispose();
    }
    this.store.clear();
  }
}
