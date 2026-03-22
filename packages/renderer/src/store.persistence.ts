// store.persistence.ts

import type { VrdAST } from '@verdant/parser';
import type { PersistedViewState, Vec3 } from './types';
import { hashForStorageKey, isFiniteVec3 } from './utils';
import { MAX_LOCALSTORAGE_KEY_LENGTH } from './constants';

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
//
//  Produces a compact, deterministic hash of the AST's structural
//  identity (node IDs + edge topology + edge labels). Two ASTs
//  with the same signature should share persisted camera/layout state.
//
//  Hashed to base-36 to keep localStorage keys short.
// ═══════════════════════════════════════════════════════════════════

function computeAstSignature(ast: VrdAST): string {
  // Sort for determinism — input order should not affect signature
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
//
//  All reads/writes go through these two functions which handle:
//  - SSR (no `window`)
//  - Private browsing / disabled storage
//  - Quota exceeded
//  - Corrupt/unparseable data
//  - Key length limits
// ═══════════════════════════════════════════════════════════════════

function safeRead<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt JSON or SecurityError — remove the bad entry
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
    if (__DEV__) {
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

/**
 * Compile-time dead-code elimination flag.
 * Bundlers (Vite/webpack/esbuild) replace `process.env.NODE_ENV`
 * so the `console.warn` calls vanish in production builds.
 */
const __DEV__ =
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV !== 'production';

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

/**
 * Validate a persisted Vec3 array.
 * Returns `null` if the value is missing, malformed, or contains
 * non-finite numbers.
 */
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

/**
 * Validate a full PersistedRendererState object.
 * Returns a sanitized copy with only valid positions, or `null`
 * if the object is fundamentally malformed.
 */
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

  // Sanitize individual positions — drop invalid entries instead of
  // rejecting the entire state
  const positions: Record<string, Vec3> = {};
  let validCount = 0;

  for (const [id, val] of Object.entries(rawPositions as Record<string, unknown>)) {
    const vec = validateVec3(val);
    if (vec) {
      positions[id] = vec;
      validCount++;
    }
  }

  // If everything was corrupt, treat as missing
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

/**
 * Validate a PersistedViewState (camera position + target + fov).
 */
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

/**
 * Read persisted renderer state (positions, selection, theme)
 * for the given AST.
 */
export function readPersistedState(
  ast: VrdAST,
): PersistedRendererState | null {
  const raw = safeRead<unknown>(getStateStorageKey(ast));
  return validateRendererState(raw);
}

/**
 * Write renderer state to localStorage, debounced by the caller
 * (typically `schedulePersist` in store.ts).
 */
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

/**
 * Compute the localStorage key for camera view persistence.
 * Exposed so `VerdantRenderer` can pass a stable key to its
 * `onViewChange` callback without recomputing the signature.
 */
export function getAstViewStorageKey(ast: VrdAST): string {
  return getViewStorageKey(ast);
}

/**
 * Read persisted camera view state.
 *
 * @param storageKey — Pre-computed key from `getAstViewStorageKey`.
 *   Accepts the key (not the AST) to allow memo-stable reads in
 *   React components where the key is already computed.
 */
export function readViewState(
  storageKey: string,
): PersistedViewState | null {
  const raw = safeRead<unknown>(storageKey);
  return validateViewState(raw);
}

/**
 * Write camera view state to localStorage.
 */
export function writeViewState(
  storageKey: string,
  view: PersistedViewState,
): void {
  safeWrite(storageKey, view);
}

// ═══════════════════════════════════════════════════════════════════
//  Cleanup Utilities
// ═══════════════════════════════════════════════════════════════════

/**
 * Remove all Verdant renderer entries from localStorage.
 * Useful for a "Reset workspace" action in the UI.
 */
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
    // SecurityError or unavailable storage — nothing to do
  }
}

/**
 * Remove persisted state for a specific AST.
 * Useful when a diagram is deleted or its structure changes enough
 * that cached positions are no longer meaningful.
 */
export function clearPersistedStateForAst(ast: VrdAST): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getStateStorageKey(ast));
    window.localStorage.removeItem(getViewStorageKey(ast));
  } catch {
    // Silently ignore
  }
}