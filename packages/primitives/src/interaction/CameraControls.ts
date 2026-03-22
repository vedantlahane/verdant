// primitives/src/interaction/CameraControls.ts

import * as THREE from 'three';

// ── Pre-allocated vectors ──
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _current = new THREE.Vector3();
const _center = new THREE.Vector3();
const _size = new THREE.Vector3();
const _sphere = new THREE.Sphere();
const _union = new THREE.Box3();

/** Smooth ease-in-out cubic. */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface CameraControlsOptions {
  /** Default camera position when no nodes exist. @default [0, 6, 12] */
  defaultPosition?: [number, number, number];
  /** Minimum padding ratio when fitting to bounds. @default 0.1 (10%) */
  fitPadding?: number;
}

/**
 * Programmatic camera animation for zoom-to-fit, focus-node, and pan-to.
 *
 * Compatible with OrbitControls — if `orbitControls` is provided,
 * both camera position AND controls target are animated together.
 */
export class CameraControls {
  private _camera: THREE.PerspectiveCamera;
  private _orbitControls: any | null = null; // OrbitControls duck type
  private _rafId: number | null = null;
  private _defaultPosition: THREE.Vector3;
  private _fitPadding: number;

  constructor(
    camera: THREE.PerspectiveCamera,
    options: CameraControlsOptions = {},
  ) {
    this._camera = camera;
    this._defaultPosition = new THREE.Vector3(
      ...(options.defaultPosition ?? [0, 6, 12]),
    );
    this._fitPadding = options.fitPadding ?? 0.1;
  }

  /** Set OrbitControls reference for coordinated animation. */
  setOrbitControls(controls: any): void {
    this._orbitControls = controls;
  }

  /** Current OrbitControls target, or origin if not set. */
  private get _target(): THREE.Vector3 {
    return this._orbitControls?.target ?? new THREE.Vector3(0, 0, 0);
  }

  // ── Public Methods ────────────────────────────────────────

  /**
   * Animate camera to fit all nodes with ≥10% padding.
   * If no nodes exist, returns to default position.
   *
   * @param nodeBounds - Map of nodeId → world-space bounding box.
   * @param duration - Animation duration in ms. @default 600
   */
  zoomToFit(
    nodeBounds: Map<string, THREE.Box3>,
    duration = 600,
  ): Promise<void> {
    if (nodeBounds.size === 0) {
      return this._animateCamera(
        this._camera.position,
        this._defaultPosition,
        this._target,
        new THREE.Vector3(0, 0, 0),
        duration,
      );
    }

    // Compute union bounding box
    _union.makeEmpty();
    for (const box of nodeBounds.values()) {
      _union.union(box);
    }

    _union.getBoundingSphere(_sphere);
    const center = _sphere.center;
    const radius = _sphere.radius;

    // Compute camera distance for the sphere to fill viewport with padding
    const fov = THREE.MathUtils.degToRad(this._camera.fov);
    const aspect = this._camera.aspect;
    const effectiveFov = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * aspect));
    const distance = (radius * (1 + this._fitPadding)) / Math.sin(effectiveFov / 2);

    // Place camera along current viewing direction (or default forward)
    const direction = new THREE.Vector3()
      .subVectors(this._camera.position, this._target)
      .normalize();

    if (direction.lengthSq() < 0.001) {
      direction.set(0, 0.5, 1).normalize();
    }

    const targetPosition = new THREE.Vector3()
      .copy(center)
      .addScaledVector(direction, distance);

    return this._animateCamera(
      this._camera.position,
      targetPosition,
      this._target,
      center,
      duration,
    );
  }

  /**
   * Animate camera to focus on a specific node.
   *
   * @param nodeId - For logging/tracking only.
   * @param nodeBox - World-space bounding box of the target node.
   * @param duration - Animation duration in ms. @default 400
   */
  focusNode(
    _nodeId: string,
    nodeBox: THREE.Box3,
    duration = 400,
  ): Promise<void> {
    nodeBox.getCenter(_center);
    nodeBox.getSize(_size);

    const nodeRadius = Math.max(_size.x, _size.y, _size.z) * 0.5;
    const fov = THREE.MathUtils.degToRad(this._camera.fov);
    const distance = Math.max(3, (nodeRadius * 3) / Math.sin(fov / 2));

    // Maintain current viewing direction
    const direction = new THREE.Vector3()
      .subVectors(this._camera.position, this._target)
      .normalize();

    if (direction.lengthSq() < 0.001) {
      direction.set(0, 0.5, 1).normalize();
    }

    const targetPosition = new THREE.Vector3()
      .copy(_center)
      .addScaledVector(direction, distance);

    return this._animateCamera(
      this._camera.position,
      targetPosition,
      this._target,
      _center,
      duration,
    );
  }

  /**
   * Animate camera target to a world position (pan without changing distance).
   *
   * @param worldPos - Target world position `[x, z]` on the ground plane.
   * @param duration - Animation duration in ms. @default 300
   */
  panTo(
    worldPos: [number, number],
    duration = 300,
  ): Promise<void> {
    const newTarget = new THREE.Vector3(worldPos[0], 0, worldPos[1]);
    const offset = new THREE.Vector3().subVectors(
      this._camera.position,
      this._target,
    );
    const newCamPos = new THREE.Vector3().copy(newTarget).add(offset);

    return this._animateCamera(
      this._camera.position,
      newCamPos,
      this._target,
      newTarget,
      duration,
    );
  }

  /** Cancel any in-progress animation. */
  cancel(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** Cancel animation and release references. */
  dispose(): void {
    this.cancel();
    this._orbitControls = null;
  }

  // ── Private ─────────────────────────────────────────────

  private _animateCamera(
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    fromTarget: THREE.Vector3,
    toTarget: THREE.Vector3,
    duration: number,
  ): Promise<void> {
    this.cancel();

    const startPos = fromPos.clone();
    const startTarget = fromTarget.clone();

    return new Promise<void>((resolve) => {
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const rawT = Math.min(elapsed / duration, 1);
        const t = easeInOutCubic(rawT);

        // Interpolate camera position
        _current.lerpVectors(startPos, toPos, t);
        this._camera.position.copy(_current);

        // Interpolate target
        if (this._orbitControls) {
          _current.lerpVectors(startTarget, toTarget, t);
          this._orbitControls.target.copy(_current);
          this._orbitControls.update();
        } else {
          _current.lerpVectors(startTarget, toTarget, t);
          this._camera.lookAt(_current);
        }

        if (rawT < 1) {
          this._rafId = requestAnimationFrame(step);
        } else {
          this._rafId = null;
          resolve();
        }
      };

      this._rafId = requestAnimationFrame(step);
    });
  }
}