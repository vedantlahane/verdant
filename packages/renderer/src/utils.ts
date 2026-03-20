// utils.ts

import * as THREE from 'three';
import { VrdGroup } from '@verdant/parser';
import { MAX_GROUP_DEPTH } from './constants';

// ── Reusable projection vector (zero allocation per call) ──

const _projVec = new THREE.Vector3();

export function projectToScreen(
  worldPos: [number, number, number],
  camera: THREE.Camera,
  size: { width: number; height: number },
): { x: number; y: number } {
  _projVec.set(...worldPos).project(camera);
  return {
    x: ((_projVec.x + 1) / 2) * size.width,
    y: ((-_projVec.y + 1) / 2) * size.height,
  };
}

// ── Deterministic seeded random ──

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Compact hash for storage keys — prevents enormous localStorage keys
 * when diagrams have many nodes.
 */
export function hashForStorageKey(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// ── Safe iterative group walk ──
// Prevents stack overflow on deeply nested / circular groups

export function safeGroupWalk(
  groups: VrdGroup[],
  callback: (group: VrdGroup, depth: number) => void,
  maxDepth: number = MAX_GROUP_DEPTH,
): void {
  const stack: Array<{ group: VrdGroup; depth: number }> = [];
  const visited = new Set<string>();

  for (let i = groups.length - 1; i >= 0; i--) {
    stack.push({ group: groups[i], depth: 0 });
  }

  while (stack.length > 0) {
    const { group, depth } = stack.pop()!;

    // Circular reference protection
    if (visited.has(group.id)) continue;
    // Depth limit
    if (depth > maxDepth) continue;

    visited.add(group.id);
    callback(group, depth);

    for (let i = group.groups.length - 1; i >= 0; i--) {
      stack.push({ group: group.groups[i], depth: depth + 1 });
    }
  }
}

// ── Position sanitization ──

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

// ── Dark mode detection from DOM ──

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
    const lightValues = ['#ffffff', '#fff', 'rgb(255, 255, 255)', 'white'];
    return !lightValues.includes(pageBg);
  } catch {
    return true;
  }
}