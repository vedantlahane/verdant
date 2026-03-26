// primitives/src/edges/pathUtils.ts

import { Vector3 } from 'three';

/**
 * Computes the world-space position at parameter `t ∈ [0, 1]` along a polyline.
 * Writes into `out` to avoid allocation. Returns `out` for chaining.
 *
 * @param path  - Array of waypoints (≥ 1 element)
 * @param t     - Normalized parameter, clamped to [0, 1]
 * @param out   - Pre-allocated output vector
 */
export function samplePathAtT(
  path: Vector3[],
  t: number,
  out: Vector3,
): Vector3 {
  const len = path.length;
  if (len === 0) return out.set(0, 0, 0);
  if (len === 1) return out.copy(path[0]);

  // Compute total polyline length
  let totalLength = 0;
  for (let i = 1; i < len; i++) {
    totalLength += path[i].distanceTo(path[i - 1]);
  }
  if (totalLength === 0) return out.copy(path[0]);

  // Walk segments to target position
  const target = Math.max(0, Math.min(1, t)) * totalLength;
  let accumulated = 0;

  for (let i = 1; i < len; i++) {
    const segLen = path[i].distanceTo(path[i - 1]);
    if (accumulated + segLen >= target) {
      const localT = segLen === 0 ? 0 : (target - accumulated) / segLen;
      return out.lerpVectors(path[i - 1], path[i], localT);
    }
    accumulated += segLen;
  }

  return out.copy(path[len - 1]);
}
