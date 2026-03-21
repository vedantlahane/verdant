import * as THREE from 'three';

/**
 * Wraps THREE.Frustum to skip update/render for nodes outside the camera frustum.
 */
export class FrustumCulling {
  private readonly frustum = new THREE.Frustum();
  private readonly projScreenMatrix = new THREE.Matrix4();

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  /**
   * Recomputes the frustum from the current camera projection and world matrices.
   * Call once per frame before issuing visibility checks.
   */
  update(): void {
    this.camera.updateMatrixWorld();
    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }

  /**
   * Returns true if the given bounding box intersects the frustum.
   */
  isVisible(box: THREE.Box3): boolean {
    return this.frustum.intersectsBox(box);
  }

  /**
   * Returns true if the given point is inside the frustum.
   */
  isPointVisible(point: THREE.Vector3): boolean {
    return this.frustum.containsPoint(point);
  }
}
