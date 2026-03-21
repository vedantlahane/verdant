import * as THREE from 'three';

export type RoutingAlgorithm = 'straight' | 'curved' | 'orthogonal';

const CURVE_SEGMENTS = 32;
const ORTHOGONAL_MAX_ITERATIONS = 10;

/**
 * Returns true if the axis-aligned segment from `a` to `b` intersects the interior of `box`.
 * The segment must be either horizontal (same y) or vertical (same x) in the XY plane.
 */
function segmentIntersectsBox(a: THREE.Vector3, b: THREE.Vector3, box: THREE.Box3): boolean {
  // Expand slightly to treat touching as non-intersecting (only interior counts)
  const eps = 1e-9;
  const minX = box.min.x + eps;
  const maxX = box.max.x - eps;
  const minY = box.min.y + eps;
  const maxY = box.max.y - eps;

  if (Math.abs(a.y - b.y) < 1e-12) {
    // Horizontal segment: y is constant
    const y = a.y;
    if (y <= minY || y >= maxY) return false;
    const segMinX = Math.min(a.x, b.x);
    const segMaxX = Math.max(a.x, b.x);
    return segMaxX > minX && segMinX < maxX;
  } else {
    // Vertical segment: x is constant
    const x = a.x;
    if (x <= minX || x >= maxX) return false;
    const segMinY = Math.min(a.y, b.y);
    const segMaxY = Math.max(a.y, b.y);
    return segMaxY > minY && segMinY < maxY;
  }
}

/**
 * Returns true if any segment in the path intersects any obstacle box.
 */
function pathIntersectsObstacles(path: THREE.Vector3[], obstacles: THREE.Box3[]): boolean {
  if (obstacles.length === 0) return false;
  for (let i = 0; i < path.length - 1; i++) {
    for (const box of obstacles) {
      if (segmentIntersectsBox(path[i], path[i + 1], box)) return true;
    }
  }
  return false;
}

/**
 * Builds an L-shaped orthogonal path: horizontal then vertical (via midpoint X).
 * All points share the same Z as `from`.
 */
function lShapeHV(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const z = from.z;
  const corner = new THREE.Vector3(to.x, from.y, z);
  return [from.clone(), corner, new THREE.Vector3(to.x, to.y, z)];
}

/**
 * Builds a Z-shaped orthogonal path: vertical then horizontal (via midpoint Y).
 * All points share the same Z as `from`.
 */
function lShapeVH(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const z = from.z;
  const corner = new THREE.Vector3(from.x, to.y, z);
  return [from.clone(), corner, new THREE.Vector3(to.x, to.y, z)];
}

export class EdgeRouter {
  /**
   * Computes a path between two world-space positions using the specified algorithm.
   *
   * - `straight`: returns [from, to]
   * - `curved`: returns a quadratic bezier arc approximation as an array of points
   * - `orthogonal`: axis-aligned L/Z-shaped routing; falls back to curved with console.warn
   *   if no collision-free path is found after ORTHOGONAL_MAX_ITERATIONS attempts
   */
  computePath(
    from: THREE.Vector3,
    to: THREE.Vector3,
    algorithm: RoutingAlgorithm,
    obstacles?: THREE.Box3[],
  ): THREE.Vector3[] {
    switch (algorithm) {
      case 'straight':
        return [from.clone(), to.clone()];

      case 'curved': {
        const mid = new THREE.Vector3(
          (from.x + to.x) / 2,
          (from.y + to.y) / 2 + from.distanceTo(to) * 0.25,
          (from.z + to.z) / 2,
        );
        const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
        return curve.getPoints(CURVE_SEGMENTS);
      }

      case 'orthogonal': {
        const obs = obstacles ?? [];

        // Try 1: horizontal-then-vertical (L-shape HV)
        const pathHV = lShapeHV(from, to);
        if (!pathIntersectsObstacles(pathHV, obs)) {
          return pathHV;
        }

        // Try 2: vertical-then-horizontal (L-shape VH)
        const pathVH = lShapeVH(from, to);
        if (!pathIntersectsObstacles(pathVH, obs)) {
          return pathVH;
        }

        // Remaining iterations: try Z-shaped paths via intermediate waypoints
        // spaced along the midpoint axis to find a clear corridor
        for (let iter = 2; iter < ORTHOGONAL_MAX_ITERATIONS; iter++) {
          const t = iter / ORTHOGONAL_MAX_ITERATIONS;
          const midX = from.x + (to.x - from.x) * t;
          const midY = from.y + (to.y - from.y) * t;
          const z = from.z;

          // Z-path via midX: from → (midX, from.y) → (midX, to.y) → to
          const pathZ1: THREE.Vector3[] = [
            from.clone(),
            new THREE.Vector3(midX, from.y, z),
            new THREE.Vector3(midX, to.y, z),
            new THREE.Vector3(to.x, to.y, z),
          ];
          if (!pathIntersectsObstacles(pathZ1, obs)) {
            return pathZ1;
          }

          // Z-path via midY: from → (from.x, midY) → (to.x, midY) → to
          const pathZ2: THREE.Vector3[] = [
            from.clone(),
            new THREE.Vector3(from.x, midY, z),
            new THREE.Vector3(to.x, midY, z),
            new THREE.Vector3(to.x, to.y, z),
          ];
          if (!pathIntersectsObstacles(pathZ2, obs)) {
            return pathZ2;
          }
        }

        // Fall back to curved routing
        console.warn(
          '[EdgeRouter] No collision-free orthogonal path found after ' +
          `${ORTHOGONAL_MAX_ITERATIONS} iterations. Falling back to curved routing.`,
        );
        return this.computePath(from, to, 'curved', obstacles);
      }

      default:
        return [from.clone(), to.clone()];
    }
  }
}
