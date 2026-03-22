// primitives/src/performance/ObjectPool.ts

import * as THREE from 'three';

/**
 * Pre-allocated reusable object pools for hot-path Three.js operations.
 *
 * Eliminates GC pressure from per-frame allocations of `Vector3`,
 * `Matrix4`, `Quaternion`, `Box3`, etc.
 *
 * **Usage pattern:**
 * ```ts
 * const pool = new ObjectPool();
 * const v = pool.getVector3();   // borrow
 * // ... use v ...
 * pool.returnVector3(v);         // return
 * ```
 *
 * Or use the scoped helper:
 * ```ts
 * pool.withVector3((v) => { v.set(1, 2, 3); ... });
 * ```
 */
export class ObjectPool {
  private _vectors: THREE.Vector3[] = [];
  private _matrices: THREE.Matrix4[] = [];
  private _quaternions: THREE.Quaternion[] = [];
  private _boxes: THREE.Box3[] = [];
  private _spheres: THREE.Sphere[] = [];

  private _vectorIdx = 0;
  private _matrixIdx = 0;
  private _quaternionIdx = 0;
  private _boxIdx = 0;
  private _sphereIdx = 0;

  constructor(initialSize = 32) {
    for (let i = 0; i < initialSize; i++) {
      this._vectors.push(new THREE.Vector3());
      this._matrices.push(new THREE.Matrix4());
      this._quaternions.push(new THREE.Quaternion());
      this._boxes.push(new THREE.Box3());
      this._spheres.push(new THREE.Sphere());
    }
  }

  // ── Vector3 ─────────────────────────────────────────────

  getVector3(): THREE.Vector3 {
    if (this._vectorIdx >= this._vectors.length) {
      this._vectors.push(new THREE.Vector3());
    }
    return this._vectors[this._vectorIdx++].set(0, 0, 0);
  }

  returnVector3(_v: THREE.Vector3): void {
    // Returning is implicit via resetFrame — kept for API clarity
  }

  withVector3<T>(fn: (v: THREE.Vector3) => T): T {
    const v = this.getVector3();
    const result = fn(v);
    return result;
  }

  // ── Matrix4 ─────────────────────────────────────────────

  getMatrix4(): THREE.Matrix4 {
    if (this._matrixIdx >= this._matrices.length) {
      this._matrices.push(new THREE.Matrix4());
    }
    return this._matrices[this._matrixIdx++].identity();
  }

  // ── Quaternion ──────────────────────────────────────────

  getQuaternion(): THREE.Quaternion {
    if (this._quaternionIdx >= this._quaternions.length) {
      this._quaternions.push(new THREE.Quaternion());
    }
    return this._quaternions[this._quaternionIdx++].identity();
  }

  // ── Box3 ────────────────────────────────────────────────

  getBox3(): THREE.Box3 {
    if (this._boxIdx >= this._boxes.length) {
      this._boxes.push(new THREE.Box3());
    }
    return this._boxes[this._boxIdx++].makeEmpty();
  }

  // ── Sphere ──────────────────────────────────────────────

  getSphere(): THREE.Sphere {
    if (this._sphereIdx >= this._spheres.length) {
      this._spheres.push(new THREE.Sphere());
    }
    const s = this._spheres[this._sphereIdx++];
    s.center.set(0, 0, 0);
    s.radius = -1;
    return s;
  }

  // ── Frame Reset ─────────────────────────────────────────

  /**
   * Reset all pool indices. Call once per frame (at the start of `useFrame`)
   * to reclaim all borrowed objects.
   */
  resetFrame(): void {
    this._vectorIdx = 0;
    this._matrixIdx = 0;
    this._quaternionIdx = 0;
    this._boxIdx = 0;
    this._sphereIdx = 0;
  }

  // ── Stats ─────────────────────────────────────────────

  getStats(): {
    vectors: { allocated: number; inUse: number };
    matrices: { allocated: number; inUse: number };
    quaternions: { allocated: number; inUse: number };
    boxes: { allocated: number; inUse: number };
    spheres: { allocated: number; inUse: number };
  } {
    return {
      vectors: { allocated: this._vectors.length, inUse: this._vectorIdx },
      matrices: { allocated: this._matrices.length, inUse: this._matrixIdx },
      quaternions: { allocated: this._quaternions.length, inUse: this._quaternionIdx },
      boxes: { allocated: this._boxes.length, inUse: this._boxIdx },
      spheres: { allocated: this._spheres.length, inUse: this._sphereIdx },
    };
  }
}