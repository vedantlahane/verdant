import { create } from 'zustand';
import { VrdAST, VrdDiagnostic } from '@verdant/parser';
import { computeLayout, computePositionsForNewNodes, LayoutType } from './layout';
import { ThemeColors, THEME_COLORS, DEFAULT_NODE_COLORS } from '@verdant/themes';

const STORAGE_PREFIX = 'verdant:renderer:v1:';
let persistTimer: number | null = null;

interface PersistedRendererState {
  positions: Record<string, [number, number, number]>;
  selectedNodeId: string | null;
  themeName: string;
}

function getAstSignature(ast: VrdAST): string {
  const nodes = ast.nodes.map((n) => n.id).sort().join('|');
  const edges = ast.edges
    .map((e) => `${e.from}->${e.to}:${String(e.props.label ?? '')}`)
    .sort()
    .join('|');
  return `${nodes}__${edges}`;
}

function getStorageKey(ast: VrdAST): string {
  return `${STORAGE_PREFIX}${getAstSignature(ast)}`;
}

function readPersistedState(ast: VrdAST): PersistedRendererState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(ast));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRendererState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedState(
  ast: VrdAST,
  positions: Record<string, [number, number, number]>,
  selectedNodeId: string | null,
  themeName: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedRendererState = {
      positions,
      selectedNodeId,
      themeName,
    };
    window.localStorage.setItem(getStorageKey(ast), JSON.stringify(payload));
  } catch {
    // Ignore persistence failures (quota/private mode).
  }
}

function schedulePersist(get: () => RendererState): void {
  if (typeof window === 'undefined') return;
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    const state = get();
    if (!state.ast) return;
    writePersistedState(
      state.ast,
      state.positions,
      state.selectedNodeId,
      state.themeName,
    );
  }, 150);
}

// ============================================
// Store interface
// ============================================

export interface RendererState {
  // Data
  ast: VrdAST | null;
  positions: Record<string, [number, number, number]>;
  diagnostics: VrdDiagnostic[];

  // Interaction
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  draggingNodeId: string | null;

  // Theme
  themeName: string;
  themeColors: ThemeColors;

  // Actions
  setAst: (ast: VrdAST, diagnostics?: VrdDiagnostic[]) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setDraggingNode: (id: string | null) => void;
  updateNodePosition: (id: string, position: [number, number, number]) => void;
  setTheme: (name: string) => void;
  getNodeColor: (type: string, customColor?: string) => string;
}

export const useRendererStore = create<RendererState>((set, get) => ({
  // ── Initial state ──
  ast: null,
  positions: {},
  diagnostics: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  draggingNodeId: null,
  themeName: 'moss',
  themeColors: THEME_COLORS['moss'],

  // ── setAst: preserve positions for existing nodes ──
  setAst: (ast, diagnostics = []) => {
    const layoutType = (ast.config.layout as LayoutType) || 'auto';
    const prevPositions = get().positions;
    const prevAst = get().ast;
    const persisted = readPersistedState(ast);

    // Compare by node IDs only — label/prop changes should NOT re-layout
    const prevIds = new Set(prevAst?.nodes.map((n) => n.id) ?? []);
    const nextIds = new Set(ast.nodes.map((n) => n.id));

    const newNodes = ast.nodes.filter((n) => !prevIds.has(n.id));
    const removedIds = new Set(
      Array.from(prevIds).filter((id) => !nextIds.has(id)),
    );

    let finalPositions: Record<string, [number, number, number]>;

    const isFirstLoad = !prevAst || Object.keys(prevPositions).length === 0;

    if (isFirstLoad) {
      finalPositions = {};

      // Try persisted positions first for this exact diagram signature.
      if (persisted?.positions) {
        for (const node of ast.nodes) {
          const saved = persisted.positions[node.id];
          if (saved) finalPositions[node.id] = saved;
        }
      }

      // Compute defaults only for nodes missing persisted positions.
      const missingNodes = ast.nodes.filter((n) => !finalPositions[n.id]);
      if (missingNodes.length > 0) {
        const computed = computeLayout(
          ast.nodes,
          ast.edges,
          layoutType,
          ast.groups,
        );
        for (const node of missingNodes) {
          const pos = computed.get(node.id);
          if (!pos) continue;
          finalPositions[node.id] = [pos.x, pos.y, pos.z];
        }
      }
    } else {
      // Preserve existing positions
      finalPositions = { ...prevPositions };

      // Remove deleted nodes
      for (const id of removedIds) {
        delete finalPositions[id];
      }

      // Place only new nodes
      if (newNodes.length > 0) {
        const newPos = computePositionsForNewNodes(
          newNodes,
          finalPositions,
          ast.edges,
        );
        Object.assign(finalPositions, newPos);
      }
    }

    // User-specified positions always override
    for (const node of ast.nodes) {
      if (node.props.position) {
        const p = node.props.position as { x: number; y: number; z: number };
        finalPositions[node.id] = [p.x, p.y, p.z];
      }
    }

    const configTheme =
      (ast.config.theme as string) ||
      persisted?.themeName ||
      get().themeName;
    const themeColors = THEME_COLORS[configTheme] || THEME_COLORS['moss'];

    // Preserve selection only if node still exists
    const prevSelected = get().selectedNodeId;
    const selectionValid = prevSelected
      ? nextIds.has(prevSelected)
      : false;

    const persistedSelected = persisted?.selectedNodeId;
    const persistedSelectionValid = persistedSelected
      ? nextIds.has(persistedSelected)
      : false;

    const finalSelectedNodeId: string | null = selectionValid
      ? prevSelected ?? null
      : persistedSelectionValid
        ? persistedSelected ?? null
        : null;

    set({
      ast,
      positions: finalPositions,
      diagnostics,
      selectedNodeId: finalSelectedNodeId,
      hoveredNodeId: null,
      themeName: configTheme,
      themeColors,
    });

    writePersistedState(ast, finalPositions, finalSelectedNodeId, configTheme);
  },

  selectNode: (id) => {
    set({ selectedNodeId: id });
    schedulePersist(get);
  },
  hoverNode: (id) => set({ hoveredNodeId: id }),
  setDraggingNode: (id) => set({ draggingNodeId: id }),

  // Called every frame during drag — only update positions map
  updateNodePosition: (id, position) =>
    (set((state) => ({
      positions: { ...state.positions, [id]: position },
    })),
    schedulePersist(get)),

  setTheme: (name) => {
    const themeColors = THEME_COLORS[name] || THEME_COLORS['moss'];
    set({ themeName: name, themeColors });
    schedulePersist(get);
  },

  getNodeColor: (type, customColor) => {
    if (customColor) return customColor;
    const { themeColors } = get();
    return themeColors.nodeDefaults?.[type] ?? themeColors.accent;
  },
}));

export { THEME_COLORS as THEMES, DEFAULT_NODE_COLORS };