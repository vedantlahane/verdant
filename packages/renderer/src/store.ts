// store.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { VrdAST, VrdNode, VrdDiagnostic } from '@verdant/parser';
import type { ThemeColors } from '@verdant/themes';
import { THEME_COLORS, DEFAULT_NODE_COLORS } from '@verdant/themes';
import { computeLayout, computePositionsForNewNodes } from './layout';
import type { LayoutType } from './layout';
import {
  readPersistedState,
  writePersistedState,
} from './store.persistence';
import { sanitizeVec3, isFiniteVec3 } from './utils';
import type { Vec3, MutVec3, ContextMenuState } from './types';
import { CONTEXT_MENU_CLOSED } from './types';
import { PERSIST_DEBOUNCE_MS } from './constants';

// ═══════════════════════════════════════════════════════════════════
//  Debounced Persistence
//
//  Bug #5 fix: The timer is now cancellable via `cancelPendingPersist()`
//  which VerdantRenderer must call in its unmount cleanup. This prevents
//  stale writes after Next.js route transitions or component removal.
//
//  Note: `persistTimer` remains module-scoped because the Zustand store
//  itself is a module-scoped singleton. True multi-instance support
//  would require per-instance stores (a larger architectural change).
// ═══════════════════════════════════════════════════════════════════

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(get: () => RendererState): void {
  if (typeof window === 'undefined') return;
  if (persistTimer !== null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;                                             // ← CHANGED: clear ref after firing
    const state = get();
    if (!state.ast) return;
    writePersistedState(
      state.ast,
      state.positions,
      state.selectedNodeId,
      state.themeName,
    );
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Cancel any pending debounced persistence write.
 *
 * **Must be called** in VerdantRenderer's `useEffect` cleanup to prevent
 * Bug #5 (stale writes firing after component unmount in route transitions).
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   return () => cancelPendingPersist();
 * }, []);
 * ```
 */
export function cancelPendingPersist(): void {                       // ← NEW
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}

/**
 * Immediately flush any pending persistence write.
 *
 * Useful for ensuring state is saved before an intentional navigation
 * (e.g., "Save & Exit" button). No-op if no write is pending.
 */
export function flushPendingPersist(): void {                        // ← NEW
  if (persistTimer === null) return;
  clearTimeout(persistTimer);
  persistTimer = null;

  const state = useRendererStore.getState();
  if (!state.ast) return;
  writePersistedState(
    state.ast,
    state.positions,
    state.selectedNodeId,
    state.themeName,
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Store Interface
// ═══════════════════════════════════════════════════════════════════

export interface RendererState {
  // ── Data ──
  readonly ast: VrdAST | null;
  readonly nodeIndex: ReadonlyMap<string, VrdNode>;
  readonly positions: Readonly<Record<string, Vec3>>;
  readonly diagnostics: readonly VrdDiagnostic[];

  // ── Selection ──
  readonly selectionSet: ReadonlySet<string>;
  readonly selectedNodeId: string | null;

  // ── Interaction ──
  readonly hoveredNodeId: string | null;
  readonly draggingNodeId: string | null;

  // ── Status ──
  readonly undoDepth: number;
  readonly canRedo: boolean;
  readonly layoutName: LayoutType;
  readonly fps: number;

  // ── Theme ──
  readonly themeName: string;
  readonly themeColors: ThemeColors;

  // ── Overlay ──
  readonly contextMenu: ContextMenuState;

  // ── Actions ──
  setAst: (ast: VrdAST, diagnostics?: VrdDiagnostic[]) => void;
  selectNode: (id: string | null) => void;
  toggleNodeSelection: (id: string) => void;
  selectMultiple: (ids: readonly string[]) => void;
  clearSelection: () => void;
  hoverNode: (id: string | null) => void;
  setDraggingNode: (id: string | null) => void;
  updateNodePosition: (id: string, position: Vec3) => void;
  batchUpdatePositions: (updates: ReadonlyMap<string, Vec3>) => void;
  setTheme: (name: string) => void;
  getNodeColor: (type: string, customColor?: string) => string;
  setSelectionSet: (ids: ReadonlySet<string>) => void;
  setUndoDepth: (depth: number) => void;
  setCanRedo: (canRedo: boolean) => void;
  setFps: (fps: number) => void;
  setContextMenu: (state: ContextMenuState) => void;
  closeContextMenu: () => void;
}

// ═══════════════════════════════════════════════════════════════════
//  Helpers — extracted from the monolithic setAst
// ═══════════════════════════════════════════════════════════════════

function resolveTheme(
  astTheme: string | undefined,
  persistedTheme: string | undefined,
  currentTheme: string,
): { name: string; colors: ThemeColors } {
  const name = astTheme || persistedTheme || currentTheme;
    const colors = THEME_COLORS[name] || THEME_COLORS['moss'];
  return { name, colors };
}

function resolveSelection(
  currentId: string | null,
  persistedId: string | null | undefined,
  validIds: ReadonlySet<string>,
): string | null {
  if (currentId && validIds.has(currentId)) return currentId;
  if (persistedId && validIds.has(persistedId)) return persistedId;
  return null;
}

function buildNodeIndex(nodes: readonly VrdNode[]): Map<string, VrdNode> {
  const index = new Map<string, VrdNode>();
  for (const node of nodes) {
    index.set(node.id, node);
  }
  return index;
}

function computeFirstLoadPositions(
  ast: VrdAST,
  layoutType: LayoutType,
  direction: 'TB' | 'LR',
  persistedPositions: Readonly<Record<string, Vec3>> | undefined,
): Record<string, MutVec3> {
  const finalPositions: Record<string, MutVec3> = {};

  if (persistedPositions) {
    for (const node of ast.nodes) {
      const saved = persistedPositions[node.id];
      if (saved && isFiniteVec3(saved)) {
        finalPositions[node.id] = [saved[0], saved[1], saved[2]];
      }
    }
  }

  const missingNodes = ast.nodes.filter((n) => !finalPositions[n.id]);
  if (missingNodes.length > 0) {
    const computed = computeLayout(
      ast.nodes,
      ast.edges,
      layoutType,
      ast.groups,
      direction,
    );
    for (const node of missingNodes) {
      const pos = computed.get(node.id);
      if (pos) {
        finalPositions[node.id] = pos;
      }
    }
  }

  return finalPositions;
}

function computeIncrementalPositions(
  ast: VrdAST,
  prevPositions: Readonly<Record<string, Vec3>>,
  prevIds: ReadonlySet<string>,
  nextIds: ReadonlySet<string>,
): Record<string, MutVec3> {
  const finalPositions: Record<string, MutVec3> = {};

  for (const id of Object.keys(prevPositions)) {
    if (nextIds.has(id)) {
      const p = prevPositions[id];
      finalPositions[id] = [p[0], p[1], p[2]];
    }
  }

  const newNodes = ast.nodes.filter((n) => !prevIds.has(n.id));
  if (newNodes.length > 0) {
    const newPos = computePositionsForNewNodes(
      newNodes,
      finalPositions,
      ast.edges,
    );
    Object.assign(finalPositions, newPos);
  }

  return finalPositions;
}

function applyUserPositionOverrides(
  nodes: readonly VrdNode[],
  positions: Record<string, MutVec3>,
): void {
  for (const node of nodes) {
    if (!node.props.position) continue;
    const p = node.props.position as { x: number; y: number; z: number };
    positions[node.id] = sanitizeVec3(p.x, p.y, p.z);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Frozen Empty Collections
//  Avoids creating new objects on every read of "empty" state.
// ═══════════════════════════════════════════════════════════════════

const EMPTY_SET = Object.freeze(new Set<string>()) as ReadonlySet<string>;
const EMPTY_DIAGNOSTICS: readonly VrdDiagnostic[] = Object.freeze([]);
const EMPTY_NODE_INDEX: ReadonlyMap<string, VrdNode> = new Map();

// ═══════════════════════════════════════════════════════════════════
//  Store
//
//  Uses `subscribeWithSelector` middleware for efficient external
//  subscriptions to specific slices (e.g. primitives SelectionManager
//  only needs selectionSet changes, not position updates).
// ═══════════════════════════════════════════════════════════════════

export const useRendererStore = create<RendererState>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial state ──
    ast: null,
    nodeIndex: EMPTY_NODE_INDEX,
    positions: {},
    diagnostics: EMPTY_DIAGNOSTICS,
    selectionSet: EMPTY_SET,
    selectedNodeId: null,
    hoveredNodeId: null,
    draggingNodeId: null,
    undoDepth: 0,
    canRedo: false,
    layoutName: 'auto' as LayoutType,
    fps: 0,
    themeName: 'moss',
    themeColors: THEME_COLORS['moss'],
    contextMenu: CONTEXT_MENU_CLOSED,

    // ────────────────────────────────────────────────────
    //  setAst — decomposed into helper functions
    // ────────────────────────────────────────────────────

    setAst: (ast, diagnostics = []) => {
      const prevState = get();
      const prevAst = prevState.ast;
      const prevPositions = prevState.positions;

      const layoutType = (ast.config.layout as LayoutType) || 'auto';
      const persisted = readPersistedState(ast);

      const prevIds = new Set(prevAst?.nodes.map((n) => n.id) ?? []);
      const nextIds = new Set(ast.nodes.map((n) => n.id));

      // ── Positions ──
      const layoutDirection = (ast.config.direction as 'TB' | 'LR') || 'TB';
      const prevLayoutType = (prevAst?.config.layout as LayoutType) || 'auto';
      const prevLayoutDir = (prevAst?.config.direction as 'TB' | 'LR') || 'TB';

      const layoutChanged = layoutType !== prevLayoutType || layoutDirection !== prevLayoutDir;
      const isFirstLoad = !prevAst || Object.keys(prevPositions).length === 0;

      const finalPositions = (isFirstLoad || layoutChanged)
        ? computeFirstLoadPositions(ast, layoutType, layoutDirection, persisted?.positions)
        : computeIncrementalPositions(ast, prevPositions, prevIds, nextIds);

      applyUserPositionOverrides(ast.nodes, finalPositions);

      // ── Theme ──
      const theme = resolveTheme(
        ast.config.theme as string | undefined,
        persisted?.themeName,
        prevState.themeName,
      );

      // ── Selection ──
      const resolvedId = resolveSelection(
        prevState.selectedNodeId,
        persisted?.selectedNodeId,
        nextIds,
      );
      const selectionSet = resolvedId
        ? new Set([resolvedId])
        : EMPTY_SET;

      // ── Commit ──
      set({
        ast,
        nodeIndex: buildNodeIndex(ast.nodes),
        positions: finalPositions,
        diagnostics,
        selectionSet,
        selectedNodeId: resolvedId,
        hoveredNodeId: null,
        layoutName: layoutType,
        themeName: theme.name,
        themeColors: theme.colors,
      });

      writePersistedState(ast, finalPositions, resolvedId, theme.name);
    },

    // ────────────────────────────────────────────────────
    //  Selection Actions
    // ────────────────────────────────────────────────────

    selectNode: (id) => {
      const newSet = id ? new Set([id]) : EMPTY_SET;
      set({
        selectionSet: newSet,
        selectedNodeId: id,
      });
      schedulePersist(get);
    },

    toggleNodeSelection: (id) => {
      const { selectionSet } = get();
      const next = new Set(selectionSet);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      const primary = next.size > 0 ? [...next][0] : null;
      set({
        selectionSet: next.size > 0 ? next : EMPTY_SET,
        selectedNodeId: primary,
      });
      schedulePersist(get);
    },

    selectMultiple: (ids) => {
      const next = new Set(ids);
      set({
        selectionSet: next.size > 0 ? next : EMPTY_SET,
        selectedNodeId: next.size > 0 ? ids[0] : null,
      });
      schedulePersist(get);
    },

    clearSelection: () => {
      set({
        selectionSet: EMPTY_SET,
        selectedNodeId: null,
      });
      schedulePersist(get);
    },

    // ────────────────────────────────────────────────────
    //  Interaction
    // ────────────────────────────────────────────────────

    hoverNode: (id) => {
      if (get().hoveredNodeId === id) return;
      set({ hoveredNodeId: id });
    },

    setDraggingNode: (id) => {
      if (get().draggingNodeId === id) return;
      set({ draggingNodeId: id });
    },

    updateNodePosition: (id, position) => {
      const prev = get().positions[id];
      if (
        prev &&
        Math.abs(prev[0] - position[0]) < 0.001 &&
        Math.abs(prev[1] - position[1]) < 0.001 &&
        Math.abs(prev[2] - position[2]) < 0.001
      ) {
        return;
      }
      set((state) => ({
        positions: { ...state.positions, [id]: position },
      }));
      schedulePersist(get);
    },

    batchUpdatePositions: (updates) => {
      if (updates.size === 0) return;
      set((state) => {
        const next = { ...state.positions };
        for (const [id, pos] of updates) {
          next[id] = pos;
        }
        return { positions: next };
      });
      schedulePersist(get);
    },

    // ────────────────────────────────────────────────────
    //  Theme
    // ────────────────────────────────────────────────────

    setTheme: (name) => {
      if (name === get().themeName) return;
      const themeColors = THEME_COLORS[name] || THEME_COLORS['moss'];
      set({ themeName: name, themeColors });
      schedulePersist(get);
    },

    getNodeColor: (type, customColor) => {
      if (customColor) return customColor;
      const { themeColors } = get();
      return themeColors.nodeDefaults?.[type] ?? themeColors.accent;
    },

    // ────────────────────────────────────────────────────
    //  External Sync (from primitives SelectionManager)
    // ────────────────────────────────────────────────────

    setSelectionSet: (ids) => {
      const arr = [...ids];
      set({
        selectionSet: ids.size > 0 ? new Set(ids) : EMPTY_SET,
        selectedNodeId: arr[0] ?? null,
      });
    },

    setUndoDepth: (depth) => {
      if (get().undoDepth === depth) return;
      set({ undoDepth: depth });
    },

    setCanRedo: (canRedo) => {
      if (get().canRedo === canRedo) return;
      set({ canRedo });
    },

    setFps: (fps) => {
      const rounded = Math.round(fps);
      if (get().fps === rounded) return;
      set({ fps: rounded });
    },

    // ────────────────────────────────────────────────────
    //  Context Menu
    // ────────────────────────────────────────────────────

    setContextMenu: (contextMenu) => {
      set({ contextMenu });
    },

    closeContextMenu: () => {
      if (!get().contextMenu.visible) return;
      set({ contextMenu: CONTEXT_MENU_CLOSED });
    },
  })),
);

// ═══════════════════════════════════════════════════════════════════
//  Re-exports for backward compatibility
// ═══════════════════════════════════════════════════════════════════

export { THEME_COLORS as THEMES, DEFAULT_NODE_COLORS };