// primitives/src/performance/FrustumCulling.ts

import * as THREE from 'three';

// ── Pre-allocated ──
const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _sphere = new THREE.Sphere();
const _center = new THREE.Vector3();

/**
 * Determines which nodes are inside the camera frustum.
 *
 * Nodes outside the frustum can skip update/render entirely,
 * providing significant performance gains for large graphs.
 *
 * @example
 * ```ts
 * const culling = new FrustumCulling();
 * // In useFrame:
 * culling.update(camera);
 * for (const [id, position] of nodePositions) {
 *   if (culling.isVisible(position, 1.0)) {
 *     // render node
 *   }
 * }
 * ```
 */
export class FrustumCulling {
  private _enabled = true;

  /** Enable or disable frustum culling. When disabled, all nodes are visible. */
  set enabled(value: boolean) {
    this._enabled = value;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Update the frustum from the current camera.
   * Call once per frame before any visibility checks.
   */
  update(camera: THREE.Camera): void {
    if (!this._enabled) return;
    _projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    _frustum.setFromProjectionMatrix(_projScreenMatrix);
  }

  /**
   * Check if a position with a given bounding radius is inside the frustum.
   *
   * @param position - World-space center of the node.
   * @param radius - Bounding sphere radius. @default 1.0
   * @returns `true` if the node is potentially visible.
   */
  isVisible(position: THREE.Vector3, radius = 1.0): boolean {
    if (!this._enabled) return true;
    _sphere.set(position, radius);
    return _frustum.intersectsSphere(_sphere);
  }

  /**
   * Check if a bounding box is inside the frustum.
   */
  isBoxVisible(box: THREE.Box3): boolean {
    if (!this._enabled) return true;
    return _frustum.intersectsBox(box);
  }

  /**
   * Filter a map of node positions to only include visible nodes.
   *
   * @param nodePositions - Map of nodeId → world position.
   * @param radius - Bounding radius per node. @default 1.0
   * @returns Set of visible node IDs.
   */
  getVisibleNodes(
    nodePositions: Map<string, THREE.Vector3>,
    radius = 1.0,
  ): Set<string> {
    if (!this._enabled) return new Set(nodePositions.keys());

    const visible = new Set<string>();
    for (const [id, pos] of nodePositions) {
      if (this.isVisible(pos, radius)) {
        visible.add(id);
      }
    }
    return visible;
  }
}