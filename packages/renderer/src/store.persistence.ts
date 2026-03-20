// store.persistence.ts

import { VrdAST } from '@verdant/parser';
import { PersistedViewState } from './types';
import { hashForStorageKey } from './utils';

const STORAGE_PREFIX = 'verdant:renderer:v1:';
const VIEW_STORAGE_PREFIX = 'verdant:renderer:view:v1:';

export interface PersistedRendererState {
  positions: Record<string, [number, number, number]>;
  selectedNodeId: string | null;
  themeName: string;
}

// ── AST signature (hashed for safety) ──

function getAstSignature(ast: VrdAST): string {
  const nodes = ast.nodes.map((n) => n.id).sort().join('|');
  const edges = ast.edges
    .map((e) => `${e.from}->${e.to}:${String(e.props.label ?? '')}`)
    .sort()
    .join('|');
  return hashForStorageKey(`${nodes}__${edges}`);
}

// ── State persistence ──

function getStorageKey(ast: VrdAST): string {
  return `${STORAGE_PREFIX}${getAstSignature(ast)}`;
}

export function readPersistedState(ast: VrdAST): PersistedRendererState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(ast));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRendererState;
    if (!parsed || typeof parsed !== 'object' || !parsed.positions) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedState(
  ast: VrdAST,
  positions: Record<string, [number, number, number]>,
  selectedNodeId: string | null,
  themeName: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedRendererState = { positions, selectedNodeId, themeName };
    window.localStorage.setItem(getStorageKey(ast), JSON.stringify(payload));
  } catch {
    // Quota exceeded or private mode — silently ignore.
  }
}

// ── View (camera) persistence ──

function getViewStorageKey(ast: VrdAST): string {
  return `${VIEW_STORAGE_PREFIX}${getAstSignature(ast)}`;
}

export function getAstViewStorageKey(ast: VrdAST): string {
  return getViewStorageKey(ast);
}

export function readViewState(storageKey: string): PersistedViewState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedViewState;
    if (
      !parsed ||
      !Array.isArray(parsed.position) ||
      parsed.position.length !== 3 ||
      !Array.isArray(parsed.target) ||
      parsed.target.length !== 3
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeViewState(storageKey: string, view: PersistedViewState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(view));
  } catch {
    // Silently ignore.
  }
}
