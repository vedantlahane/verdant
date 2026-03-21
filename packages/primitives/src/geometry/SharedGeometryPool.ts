import * as THREE from 'three';

export interface GeometryPoolStats {
  cachedCount: number;
  totalReferenceCount: number;
}

interface PoolEntry {
  geometry: THREE.BufferGeometry;
  refCount: number;
}

/**
 * Reference-counted cache for Three.js geometry instances.
 * All geometry lifecycle (dispose) is managed exclusively by this pool —
 * consumers must never call .dispose() directly on acquired geometries.
 */
export class SharedGeometryPool {
  private readonly store = new Map<string, PoolEntry>();

  /**
   * Acquire a geometry by key. If the key already exists, increments refCount
   * and returns the cached instance. Otherwise calls factory() and stores it
   * with refCount 1.
   */
  acquire(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    const entry = this.store.get(key);
    if (entry) {
      entry.refCount++;
      return entry.geometry;
    }
    const geometry = factory();
    this.store.set(key, { geometry, refCount: 1 });
    return geometry;
  }

  /**
   * Release a geometry by key. Decrements refCount; when it reaches 0,
   * calls geometry.dispose() and removes the key from the pool.
   * Double-release (refCount already 0) is a no-op with a console.warn.
   */
  release(key: string): void {
    const entry = this.store.get(key);
    if (!entry) {
      console.warn(`SharedGeometryPool: attempted to release unknown key "${key}"`);
      return;
    }
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.geometry.dispose();
      this.store.delete(key);
    }
  }

  /**
   * Returns current pool statistics.
   */
  getStats(): GeometryPoolStats {
    let totalReferenceCount = 0;
    for (const entry of this.store.values()) {
      totalReferenceCount += entry.refCount;
    }
    return {
      cachedCount: this.store.size,
      totalReferenceCount,
    };
  }

  /**
   * Disposes all cached geometries and clears the pool.
   */
  dispose(): void {
    for (const entry of this.store.values()) {
      entry.geometry.dispose();
    }
    this.store.clear();
  }
}
