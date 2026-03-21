import * as THREE from 'three';

const DEFAULT_POOL_SIZE = 32;

/**
 * Pre-allocates and reuses THREE.Vector3, THREE.Matrix4, and THREE.Quaternion
 * instances to reduce GC pressure in hot render loops.
 */
export class ObjectPool {
  private readonly maxSize: number;
  private readonly vector3Pool: THREE.Vector3[] = [];
  private readonly matrix4Pool: THREE.Matrix4[] = [];
  private readonly quaternionPool: THREE.Quaternion[] = [];

  constructor(initialSize = DEFAULT_POOL_SIZE, maxSize = DEFAULT_POOL_SIZE) {
    this.maxSize = maxSize;
    for (let i = 0; i < initialSize; i++) {
      this.vector3Pool.push(new THREE.Vector3());
      this.matrix4Pool.push(new THREE.Matrix4());
      this.quaternionPool.push(new THREE.Quaternion());
    }
  }

  acquireVector3(): THREE.Vector3 {
    const v = this.vector3Pool.pop();
    if (v) {
      v.set(0, 0, 0);
      return v;
    }
    return new THREE.Vector3();
  }

  releaseVector3(v: THREE.Vector3): void {
    if (this.vector3Pool.length < this.maxSize) {
      this.vector3Pool.push(v);
    }
  }

  acquireMatrix4(): THREE.Matrix4 {
    const m = this.matrix4Pool.pop();
    if (m) {
      m.identity();
      return m;
    }
    return new THREE.Matrix4();
  }

  releaseMatrix4(m: THREE.Matrix4): void {
    if (this.matrix4Pool.length < this.maxSize) {
      this.matrix4Pool.push(m);
    }
  }

  acquireQuaternion(): THREE.Quaternion {
    const q = this.quaternionPool.pop();
    if (q) {
      q.identity();
      return q;
    }
    return new THREE.Quaternion();
  }

  releaseQuaternion(q: THREE.Quaternion): void {
    if (this.quaternionPool.length < this.maxSize) {
      this.quaternionPool.push(q);
    }
  }

  dispose(): void {
    this.vector3Pool.length = 0;
    this.matrix4Pool.length = 0;
    this.quaternionPool.length = 0;
  }
}
