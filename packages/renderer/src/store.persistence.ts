// store.persistence.ts

import type { VrdAST } from '@verdant/parser';
import type { PersistedViewState, Vec3 } from './types';
import { hashForStorageKey, isFiniteVec3 } from './utils';
import { MAX_LOCALSTORAGE_KEY_LENGTH } from './constants';
import { __DEV__ } from './shared';                                    // ← CHANGED: consolidated (Bug #25)

// ═══════════════════════════════════════════════════════════════════
//  Storage Key Prefixes
// ═══════════════════════════════════════════════════════════════════

const STORAGE_PREFIX = 'verdant:renderer:v1:';
const VIEW_STORAGE_PREFIX = 'verdant:renderer:view:v1:';

// ═══════════════════════════════════════════════════════════════════
//  Persisted State Shape
// ═══════════════════════════════════════════════════════════════════

export interface PersistedRendererState {
  readonly positions: Readonly<Record<string, Vec3>>;
  readonly selectedNodeId: string | null;
  readonly themeName: string;
}

// ═══════════════════════════════════════════════════════════════════
//  AST Signature
// ═══════════════════════════════════════════════════════════════════

function computeAstSignature(ast: VrdAST): string {
  const nodesSig = ast.nodes
    .map((n) => n.id)
    .sort()
    .join('|');

  const edgesSig = ast.edges
    .map((e) => `${e.from}->${e.to}:${String(e.props.label ?? '')}`)
    .sort()
    .join('|');

  return hashForStorageKey(`${nodesSig}__${edgesSig}`);
}

// ═══════════════════════════════════════════════════════════════════
//  Safe localStorage Access
// ═══════════════════════════════════════════════════════════════════

function safeRead<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // If we can't even remove it, give up silently
    }
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;

  if (key.length > MAX_LOCALSTORAGE_KEY_LENGTH) {
    if (__DEV__) {                                                     // ← CHANGED: uses shared __DEV__
      console.warn(
        `[VerdantRenderer] localStorage key exceeds ${MAX_LOCALSTORAGE_KEY_LENGTH} chars — skipping write. Key: "${key.slice(0, 60)}…"`,
      );
    }
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or SecurityError — silently ignore
  }
}

// Removed local __DEV__ — now imported from shared.ts (Bug #25)       ← CHANGED

// ═══════════════════════════════════════════════════════════════════
//  Key Builders
// ═══════════════════════════════════════════════════════════════════

function getStateStorageKey(ast: VrdAST): string {
  return `${STORAGE_PREFIX}${computeAstSignature(ast)}`;
}

function getViewStorageKey(ast: VrdAST): string {
  return `${VIEW_STORAGE_PREFIX}${computeAstSignature(ast)}`;
}

// ═══════════════════════════════════════════════════════════════════
//  Validation Helpers
// ═══════════════════════════════════════════════════════════════════

function validateVec3(v: unknown): Vec3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [x, y, z] = v;
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof z !== 'number'
  ) {
    return null;
  }
  const vec: Vec3 = [x, y, z];
  return isFiniteVec3(vec) ? vec : null;
}

function validateRendererState(
  raw: unknown,
): PersistedRendererState | null {
  if (
    raw === null ||
    typeof raw !== 'object' ||
    !('positions' in (raw as any))
  ) {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const rawPositions = candidate.positions;

  if (rawPositions === null || typeof rawPositions !== 'object') {
    return null;
  }

  const positions: Record<string, Vec3> = {};
  let validCount = 0;

  for (const [id, val] of Object.entries(rawPositions as Record<string, unknown>)) {
    const vec = validateVec3(val);
    if (vec) {
      positions[id] = vec;
      validCount++;
    }
  }

  if (validCount === 0 && Object.keys(rawPositions as object).length > 0) {
    return null;
  }

  return {
    positions,
    selectedNodeId:
      typeof candidate.selectedNodeId === 'string'
        ? candidate.selectedNodeId
        : null,
    themeName:
      typeof candidate.themeName === 'string'
        ? candidate.themeName
        : 'moss',
  };
}

function validateViewState(raw: unknown): PersistedViewState | null {
  if (raw === null || typeof raw !== 'object') return null;

  const candidate = raw as Record<string, unknown>;
  const position = validateVec3(candidate.position);
  const target = validateVec3(candidate.target);

  if (!position || !target) return null;

  const fov = typeof candidate.fov === 'number' && Number.isFinite(candidate.fov)
    ? candidate.fov
    : null;

  if (fov === null) return null;

  return { position, target, fov };
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Renderer State
// ═══════════════════════════════════════════════════════════════════

export function readPersistedState(
  ast: VrdAST,
): PersistedRendererState | null {
  const raw = safeRead<unknown>(getStateStorageKey(ast));
  return validateRendererState(raw);
}

export function writePersistedState(
  ast: VrdAST,
  positions: Readonly<Record<string, Vec3>>,
  selectedNodeId: string | null,
  themeName: string,
): void {
  const payload: PersistedRendererState = {
    positions,
    selectedNodeId,
    themeName,
  };
  safeWrite(getStateStorageKey(ast), payload);
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — View (Camera) State
// ═══════════════════════════════════════════════════════════════════

export function getAstViewStorageKey(ast: VrdAST): string {
  return getViewStorageKey(ast);
}

export function readViewState(
  storageKey: string,
): PersistedViewState | null {
  const raw = safeRead<unknown>(storageKey);
  return validateViewState(raw);
}

export function writeViewState(
  storageKey: string,
  view: PersistedViewState,
): void {
  safeWrite(storageKey, view);
}

// ═══════════════════════════════════════════════════════════════════
//  Cleanup Utilities
// ═══════════════════════════════════════════════════════════════════

export function clearAllPersistedState(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (
        key &&
        (key.startsWith(STORAGE_PREFIX) ||
          key.startsWith(VIEW_STORAGE_PREFIX))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // SecurityError or unavailable storage
  }
}

export function clearPersistedStateForAst(ast: VrdAST): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getStateStorageKey(ast));
    window.localStorage.removeItem(getViewStorageKey(ast));
  } catch {
    // Silently ignore
  }
}