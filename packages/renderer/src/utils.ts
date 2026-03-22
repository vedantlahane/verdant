// utils.ts

import * as THREE from 'three';
import type { VrdGroup } from '@verdant/parser';
import type { Vec3, MutVec3, ScreenPoint } from './types';
import { MAX_GROUP_DEPTH } from './constants';

// ═══════════════════════════════════════════════════════════════════
//  Vec3 Helpers
//  Eliminates duplicated distance/validation logic across 6+ files
// ═══════════════════════════════════════════════════════════════════

/** Frozen origin — safe as default arg without allocating new arrays each call */
export const VEC3_ORIGIN: Vec3 = Object.freeze([0, 0, 0]) as unknown as Vec3;

/** Squared Euclidean distance (avoids sqrt — use for comparisons) */
export function vec3DistanceSq(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

/** Euclidean distance */
export function vec3Distance(a: Vec3, b: Vec3): number {
  return Math.sqrt(vec3DistanceSq(a, b));
}

/** True if all three components are finite (not NaN / ±Infinity) */
export function isFiniteVec3(v: Vec3): boolean {
  return Number.isFinite(v[0]) && Number.isFinite(v[1]) && Number.isFinite(v[2]);
}

/** Replace non-finite components with 0. Returns a new mutable tuple. */
export function sanitizeVec3(x: number, y: number, z: number): MutVec3 {
  return [
    Number.isFinite(x) ? x : 0,
    Number.isFinite(y) ? y : 0,
    Number.isFinite(z) ? z : 0,
  ];
}

/**
 * @deprecated Prefer `sanitizeVec3` which returns `MutVec3`.
 * Kept temporarily for layout.ts backward compat — will be removed.
 */
export function sanitizePosition(
  x: number,
  y: number,
  z: number,
): { x: number; y: number; z: number } {
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    z: Number.isFinite(z) ? z : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Screen Projection
// ═══════════════════════════════════════════════════════════════════

/**
 * Project a world-space position to screen-space pixel coordinates.
 *
 * Uses a module-scoped Vector3 to avoid per-call allocation.
 * Safe in JS single-threaded execution — the function body is fully
 * synchronous so no interleaving is possible, even under React
 * concurrent mode (which only interrupts between synchronous chunks).
 */
const _projVec = new THREE.Vector3();

export function projectToScreen(
  worldPos: Vec3,
  camera: THREE.Camera,
  size: { readonly width: number; readonly height: number },
): ScreenPoint {
  // Avoid spread: `set(...worldPos)` creates an intermediate array
  _projVec.set(worldPos[0], worldPos[1], worldPos[2]).project(camera);
  return {
    x: ((_projVec.x + 1) * 0.5) * size.width,
    y: ((-_projVec.y + 1) * 0.5) * size.height,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Deterministic Seeded Random (Park-Miller LCG)
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a deterministic PRNG closure.
 *
 * Algorithm:  s' = (s × 7⁵) mod (2³¹ − 1)
 * Period:     2³¹ − 2 ≈ 2.1 billion
 * Range:      (0, 1) exclusive of both endpoints
 *
 * @param seed – integer seed. Zero is remapped to 1 (zero is a fixed point).
 */
export function seededRandom(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Hashing
// ═══════════════════════════════════════════════════════════════════

/**
 * DJB2 hash → non-negative 32-bit integer.
 *
 * The original used `Math.abs()` which has an edge case:
 * `Math.abs(-2147483648)` → `2147483648` (exceeds signed 32-bit range).
 * We use `>>> 0` (unsigned right-shift) for a guaranteed [0, 2³²-1] result.
 *
 * ⚠️  This changes hash output for ~1 in 2³¹ inputs.
 *     Existing localStorage keys using the old hash will become orphaned
 *     (benign: they'll be ignored and new entries are created).
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Compact base-36 hash suitable for localStorage keys.
 *
 * The original implementation used a different algorithm (Java's `String.hashCode`:
 * `h * 31 + char`) than `hashString` (DJB2: `h * 33 + char`).
 * Now consolidated to DJB2 for consistency.
 */
export function hashForStorageKey(input: string): string {
  return hashString(input).toString(36);
}

// ═══════════════════════════════════════════════════════════════════
//  Safe Iterative Group Walk
// ═══════════════════════════════════════════════════════════════════

/**
 * Iterative depth-first traversal of nested VrdGroup trees.
 *
 * Protections:
 * - Circular reference detection via visited set
 * - Configurable max depth (default 100)
 * - Stack-based (no recursion → no stack overflow on deep nesting)
 */
export function safeGroupWalk(
  groups: readonly VrdGroup[],
  callback: (group: VrdGroup, depth: number) => void,
  maxDepth: number = MAX_GROUP_DEPTH,
): void {
  if (groups.length === 0) return;

  // Pre-allocate with reasonable capacity estimate
  const stack: Array<{ group: VrdGroup; depth: number }> =
    new Array(Math.min(groups.length * 2, 256));
  let stackSize = 0;

  const visited = new Set<string>();

  // Push in reverse for left-to-right traversal order
  for (let i = groups.length - 1; i >= 0; i--) {
    stack[stackSize++] = { group: groups[i], depth: 0 };
  }

  while (stackSize > 0) {
    const { group, depth } = stack[--stackSize];

    if (visited.has(group.id) || depth > maxDepth) continue;
    visited.add(group.id);

    callback(group, depth);

    const children = group.groups;
    for (let i = children.length - 1; i >= 0; i--) {
      // Grow if needed (rare — only with very wide trees)
      if (stackSize >= stack.length) stack.length *= 2;
      stack[stackSize++] = { group: children[i], depth: depth + 1 };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Dark Mode Detection
// ═══════════════════════════════════════════════════════════════════

/** Set of known light-mode background values (O(1) lookup vs O(n) array scan) */
const LIGHT_BG_VALUES: ReadonlySet<string> = new Set([
  '#ffffff',
  '#fff',
  'rgb(255, 255, 255)',
  'white',
]);

/**
 * Detect dark mode from DOM state.
 *
 * Priority:
 * 1. `data-theme` attribute on `<html>` → 'dark' | 'light'
 * 2. `--page-bg` CSS custom property → compared against known light values
 * 3. Fallback: `true` (assume dark mode in SSR, errors, or unknown state)
 */
export function detectDarkMode(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const root = document.documentElement;
    const dataTheme = root?.dataset?.theme;
    if (dataTheme === 'dark') return true;
    if (dataTheme === 'light') return false;

    const pageBg = getComputedStyle(root)
      .getPropertyValue('--page-bg')
      .trim()
      .toLowerCase();

    if (!pageBg) return true;
    return !LIGHT_BG_VALUES.has(pageBg);
  } catch {
    return true;
  }
}