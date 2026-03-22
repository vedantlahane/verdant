// primitives/src/geometry/SharedGeometryPool.ts

import * as THREE from 'three';

export interface GeometryPoolStats {
  /** Number of unique geometry keys currently cached. */
  cachedCount: number;
  /** Sum of all reference counts across all cached geometries. */
  totalReferenceCount: number;
}

interface PoolEntry {
  geometry: THREE.BufferGeometry;
  refCount: number;
}

/**
 * Reference-counted cache for Three.js geometry instances.
 *
 * **All geometry lifecycle (`dispose`) is managed exclusively by this pool.**
 * Consumers must NEVER call `.dispose()` directly on acquired geometries.
 *
 * @example
 * ```ts
 * const pool = new SharedGeometryPool();
 * const geo = pool.acquire('box:1,1,1', () => new THREE.BoxGeometry(1, 1, 1));
 * // ... use geo ...
 * pool.release('box:1,1,1'); // decrements refCount; disposes at 0
 * ```
 */
export class SharedGeometryPool {
  private readonly _store = new Map<string, PoolEntry>();

  /**
   * Acquire a geometry by key.
   *
   * - If the key exists: increments `refCount`, returns the cached geometry.
   * - If the key is new: calls `factory()`, caches with `refCount = 1`.
   */
  acquire(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    const entry = this._store.get(key);
    if (entry) {
      entry.refCount++;
      return entry.geometry;
    }
    const geometry = factory();
    this._store.set(key, { geometry, refCount: 1 });
    return geometry;
  }

  /**
   * Release a geometry by key.
   *
   * - Decrements `refCount`.
   * - At `refCount === 0`: calls `geometry.dispose()` and removes from cache.
   * - Releasing an unknown key is a no-op with a dev warning.
   *
   * @returns `true` if the entry was found and decremented.
   */
  release(key: string): boolean {
    const entry = this._store.get(key);
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[SharedGeometryPool] Attempted to release unknown key "${key}". ` +
          `This usually means a double-release or mismatched acquire/release.`,
        );
      }
      return false;
    }

    entry.refCount--;

    if (entry.refCount <= 0) {
      entry.geometry.dispose();
      this._store.delete(key);
    }

    return true;
  }

  /** Check whether a key exists in the pool. */
  has(key: string): boolean {
    return this._store.has(key);
  }

  /** Get current reference count for a key, or 0 if not found. */
  getRefCount(key: string): number {
    return this._store.get(key)?.refCount ?? 0;
  }

  /** Returns current pool statistics. */
  getStats(): GeometryPoolStats {
    let totalReferenceCount = 0;
    for (const entry of this._store.values()) {
      totalReferenceCount += entry.refCount;
    }
    return {
      cachedCount: this._store.size,
      totalReferenceCount,
    };
  }

  /** Disposes all cached geometries and clears the pool. */
  dispose(): void {
    for (const entry of this._store.values()) {
      entry.geometry.dispose();
    }
    this._store.clear();
  }
}