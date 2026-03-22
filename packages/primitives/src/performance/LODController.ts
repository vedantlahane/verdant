// primitives/src/performance/LODController.ts

import * as THREE from 'three';

// ── Pre-allocated ──
const _screenSize = new THREE.Vector2();
const _ndcPos = new THREE.Vector4();

export type LODLevel = 'full' | 'medium' | 'low' | 'billboard' | 'hidden';

export interface LODThresholds {
  /** Screen pixels below which to use medium detail. @default 80 */
  medium: number;
  /** Screen pixels below which to use low detail. @default 30 */
  low: number;
  /** Screen pixels below which to use billboard sprite. @default 10 */
  billboard: number;
  /** Screen pixels below which to hide entirely. @default 3 */
  hidden: number;
}

const DEFAULT_THRESHOLDS: LODThresholds = {
  medium: 80,
  low: 30,
  billboard: 10,
  hidden: 3,
};

/**
 * Determines the appropriate level of detail for each node based on
 * its projected screen size.
 *
 * @example
 * ```ts
 * const lod = new LODController();
 * // In useFrame:
 * const level = lod.getLevel(nodePosition, nodeRadius, camera, canvasHeight);
 * switch (level) {
 *   case 'full': // render high-detail geometry
 *   case 'medium': // render simplified geometry
 *   case 'low': // render very simple geometry
 *   case 'billboard': // render flat sprite
 *   case 'hidden': // skip entirely
 * }
 * ```
 */
export class LODController {
  private _thresholds: LODThresholds;
  private _enabled = true;

  constructor(thresholds?: Partial<LODThresholds>) {
    this._thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Compute the LOD level for a node.
   *
   * @param position - World-space center of the node.
   * @param radius - World-space bounding radius.
   * @param camera - Current perspective camera.
   * @param canvasHeight - Canvas height in CSS pixels.
   */
  getLevel(
    position: THREE.Vector3,
    radius: number,
    camera: THREE.PerspectiveCamera,
    canvasHeight: number,
  ): LODLevel {
    if (!this._enabled) return 'full';

    const screenPx = this._getScreenSize(position, radius, camera, canvasHeight);

    if (screenPx <= this._thresholds.hidden) return 'hidden';
    if (screenPx <= this._thresholds.billboard) return 'billboard';
    if (screenPx <= this._thresholds.low) return 'low';
    if (screenPx <= this._thresholds.medium) return 'medium';
    return 'full';
  }

  /**
   * Batch-compute LOD levels for all nodes.
   */
  computeAll(
    nodePositions: Map<string, THREE.Vector3>,
    nodeRadii: Map<string, number> | number,
    camera: THREE.PerspectiveCamera,
    canvasHeight: number,
  ): Map<string, LODLevel> {
    const result = new Map<string, LODLevel>();
    const defaultRadius = typeof nodeRadii === 'number' ? nodeRadii : 1.0;

    for (const [id, pos] of nodePositions) {
      const radius = typeof nodeRadii === 'number'
        ? defaultRadius
        : (nodeRadii.get(id) ?? defaultRadius);
      result.set(id, this.getLevel(pos, radius, camera, canvasHeight));
    }

    return result;
  }

  // ── Private ─────────────────────────────────────────────

  /**
   * Estimate the screen-space diameter (in pixels) of a sphere.
   */
  private _getScreenSize(
    position: THREE.Vector3,
    radius: number,
    camera: THREE.PerspectiveCamera,
    canvasHeight: number,
  ): number {
    // Project center to NDC
    _ndcPos.set(position.x, position.y, position.z, 1);
    _ndcPos.applyMatrix4(camera.matrixWorldInverse);
    _ndcPos.applyMatrix4(camera.projectionMatrix);

    if (_ndcPos.w <= 0) return 0; // Behind camera

    // NDC depth
    const ndcZ = _ndcPos.z / _ndcPos.w;
    if (ndcZ < -1 || ndcZ > 1) return 0; // Outside clip range

    // Approximate screen size from FOV and distance
    const distance = camera.position.distanceTo(position);
    if (distance < 0.001) return canvasHeight; // On top of camera

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const screenHeight = canvasHeight;
    const projectedSize = (radius * 2 * screenHeight) / (2 * distance * Math.tan(fovRad / 2));

    return Math.abs(projectedSize);
  }
}