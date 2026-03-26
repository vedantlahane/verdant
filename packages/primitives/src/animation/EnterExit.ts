// primitives/src/animation/EnterExit.ts

import type { AnimationType } from '../types';

/**
 * Compile-time exhaustiveness check.
 * If all union members are handled, this is unreachable.
 * If a new member is added without a case, TypeScript errors here.
 */
function assertNever(value: never): AnimationProperties {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[EnterExit] Unhandled animation type: "${value}". Falling back to fade.`);
  }
  // Runtime fallback to fade
  return setResult(1, 1, 1, 1, 0, 0, 0);
}

/**
 * Plain-object animation properties — no Three.js allocations.
 * Called every frame, so MUST be allocation-free.
 */
export interface AnimationProperties {
  opacity: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
}

/** World units to slide from/to. */
const SLIDE_DISTANCE = 0.5;

/** Identity properties (fully visible, no transform). */
const IDENTITY: Readonly<AnimationProperties> = Object.freeze({
  opacity: 1,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
});

// ── Pre-allocated result object (reused across calls to avoid GC) ──
const _result: AnimationProperties = { ...IDENTITY };

function setResult(
  opacity: number,
  sx: number, sy: number, sz: number,
  ox: number, oy: number, oz: number,
): AnimationProperties {
  _result.opacity = opacity;
  _result.scaleX = sx;
  _result.scaleY = sy;
  _result.scaleZ = sz;
  _result.offsetX = ox;
  _result.offsetY = oy;
  _result.offsetZ = oz;
  return _result;
}

/**
 * Compute animation properties for an **enter** animation at `progress ∈ [0, 1]`.
 *
 * - `progress = 0` → invisible / offscreen (animation start)
 * - `progress = 1` → fully visible (animation end)
 *
 * **Warning:** Returns a shared mutable object. Copy values immediately if
 * you need to store them.
 */
export function getEnterProperties(
  type: AnimationType,
  progress: number,
): AnimationProperties {
  const p = Math.max(0, Math.min(1, progress));

  switch (type) {
    case 'fade':
      return setResult(p, 1, 1, 1, 0, 0, 0);

    case 'scale': {
      // Smooth scale-up with slight ease
      const s = p * p * (3 - 2 * p); // smoothstep
      return setResult(p, s, s, s, 0, 0, 0);
    }

    case 'slide':
      // Slide up from below
      return setResult(p, 1, 1, 1, 0, SLIDE_DISTANCE * (p - 1), 0);

    default:
      return assertNever(type);  // ← Compile-time exhaustiveness
  }
}

/**
 * Compute animation properties for an **exit** animation at `progress ∈ [0, 1]`.
 *
 * - `progress = 0` → fully visible (animation start)
 * - `progress = 1` → invisible / offscreen (animation end)
 *
 * **Warning:** Returns a shared mutable object. Copy values immediately if
 * you need to store them.
 */
export function getExitProperties(
  type: AnimationType,
  progress: number,
): AnimationProperties {
  const p = Math.max(0, Math.min(1, progress));
  const inv = 1 - p;

  switch (type) {
    case 'fade':
      return setResult(inv, 1, 1, 1, 0, 0, 0);

    case 'scale': {
      const s = inv * inv * (3 - 2 * inv); // smoothstep
      return setResult(inv, s, s, s, 0, 0, 0);
    }

    case 'slide':
      // Slide down and out
      return setResult(inv, 1, 1, 1, 0, -SLIDE_DISTANCE * p, 0);

    default:
      return assertNever(type);  // ← Compile-time exhaustiveness
  }
}

export const EnterExit = {
  getEnterProperties,
  getExitProperties,
};