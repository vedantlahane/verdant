// primitives/src/edges/EdgeRouter.ts

import { Box3, QuadraticBezierCurve3, Vector3 } from 'three';
import type { RoutingAlgorithm } from '../types';

export type { RoutingAlgorithm };

const CURVE_SEGMENTS = 32;
const ORTHOGONAL_MAX_ITERATIONS = 10;

// ── Pre-allocated for curved path computation ──
const _curveFrom = new Vector3();
const _curveMid = new Vector3();
const _curveTo = new Vector3();
const _reusableCurve = new QuadraticBezierCurve3(
  _curveFrom, _curveMid, _curveTo,
);

// ── Exhaustiveness check for routing algorithms ──
function assertNeverAlgorithm(value: never): Vector3[] {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[EdgeRouter] Unhandled algorithm "${value}". Using straight.`);
  }
  return [];
}

/**
 * Returns true if an axis-aligned segment from `a` to `b` intersects the interior of `box`.
 * Uses parametric ray-box intersection, works in full 3D.
 */
function segmentIntersectsBox(
  a: Vector3,
  b: Vector3,
  box: Box3,
): boolean {
  const eps = 1e-6;
  const dir = [b.x - a.x, b.y - a.y, b.z - a.z];
  const origin = [a.x, a.y, a.z];
  const bMin = [box.min.x, box.min.y, box.min.z];
  const bMax = [box.max.x, box.max.y, box.max.z];

  let tMin = 0;
  let tMax = 1;

  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(dir[axis]) < eps) {
      if (origin[axis] < bMin[axis] + eps || origin[axis] > bMax[axis] - eps) {
        return false;
      }
    } else {
      let t1 = (bMin[axis] - origin[axis]) / dir[axis];
      let t2 = (bMax[axis] - origin[axis]) / dir[axis];
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }

  return true;
}

/**
 * Returns true if any segment in the path intersects any obstacle box.
 */
function pathIntersectsObstacles(
  path: Vector3[],
  obstacles: Box3[],
): boolean {
  if (obstacles.length === 0) return false;
  for (let i = 0; i < path.length - 1; i++) {
    for (const box of obstacles) {
      if (segmentIntersectsBox(path[i], path[i + 1], box)) return true;
    }
  }
  return false;
}

/**
 * L-shape: move along X first, then Y. Z interpolated to midpoint.
 */
function lShapeXY(from: Vector3, to: Vector3): Vector3[] {
  const midZ = (from.z + to.z) / 2;
  return [
    from.clone(),
    new Vector3(to.x, from.y, midZ),
    new Vector3(to.x, to.y, to.z),
  ];
}

/**
 * L-shape: move along Y first, then X. Z interpolated to midpoint.
 */
function lShapeYX(from: Vector3, to: Vector3): Vector3[] {
  const midZ = (from.z + to.z) / 2;
  return [
    from.clone(),
    new Vector3(from.x, to.y, midZ),
    new Vector3(to.x, to.y, to.z),
  ];
}

/**
 * Stateless edge path computation.
 * All methods are static — no instantiation needed.
 *
 * @example
 * ```ts
 * const path = EdgeRouter.computePath(fromVec, toVec, 'orthogonal', obstacles);
 * ```
 */
export class EdgeRouter {
  /**
   * Computes a path between two world-space positions.
   *
   * - `straight`: direct line `[from, to]`
   * - `curved`: quadratic bezier arc, height scales with distance
   * - `orthogonal`: axis-aligned L/Z-shaped segments; falls back to `curved`
   *   if no collision-free path found after max iterations
   */
  static computePath(
    from: Vector3,
    to: Vector3,
    algorithm: RoutingAlgorithm,
    obstacles?: Box3[],
  ): Vector3[] {
    switch (algorithm) {
      case 'straight':
        return [from.clone(), to.clone()];

      case 'curved': {
        const dist = from.distanceTo(to);
        const arcHeight = Math.min(0.8, Math.max(0.2, dist * 0.2));

        _curveFrom.copy(from);
        _curveTo.copy(to);
        _curveMid.set(
          (from.x + to.x) / 2,
          (from.y + to.y) / 2 + arcHeight,
          (from.z + to.z) / 2,
        );

        // getPoints() still allocates — but the curve object itself is reused
        return _reusableCurve.getPoints(CURVE_SEGMENTS);
      }

      case 'orthogonal': {
        const obs = obstacles ?? [];

        // Attempt 1: L-shape X-first
        const pathXY = lShapeXY(from, to);
        if (!pathIntersectsObstacles(pathXY, obs)) return pathXY;

        // Attempt 2: L-shape Y-first
        const pathYX = lShapeYX(from, to);
        if (!pathIntersectsObstacles(pathYX, obs)) return pathYX;

        // Attempts 3–N: Z-shaped paths via intermediate waypoints
        for (let iter = 2; iter < ORTHOGONAL_MAX_ITERATIONS; iter++) {
          const t = iter / ORTHOGONAL_MAX_ITERATIONS;

          // Z-path via intermediate X
          const midX = from.x + (to.x - from.x) * t;
          const midZ = (from.z + to.z) / 2;
          const pathZ1: Vector3[] = [
            from.clone(),
            new Vector3(midX, from.y, midZ),
            new Vector3(midX, to.y, midZ),
            to.clone(),
          ];
          if (!pathIntersectsObstacles(pathZ1, obs)) return pathZ1;

          // Z-path via intermediate Y
          const midY = from.y + (to.y - from.y) * t;
          const pathZ2: Vector3[] = [
            from.clone(),
            new Vector3(from.x, midY, midZ),
            new Vector3(to.x, midY, midZ),
            to.clone(),
          ];
          if (!pathIntersectsObstacles(pathZ2, obs)) return pathZ2;
        }

        // All orthogonal attempts failed → fall back to curved
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[EdgeRouter] No collision-free orthogonal path found after ` +
            `${ORTHOGONAL_MAX_ITERATIONS} iterations. Falling back to curved routing.`,
          );
        }
        return EdgeRouter.computePath(from, to, 'curved', obstacles);
      }

      default: {
        const fallback = assertNeverAlgorithm(algorithm);
        // Runtime fallback: straight line
        return fallback.length > 0 ? fallback : [from.clone(), to.clone()];
      }
    }
  }
}