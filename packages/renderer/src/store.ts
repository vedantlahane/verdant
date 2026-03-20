import { create } from 'zustand';
import { VrdAST, VrdDiagnostic } from '@verdant/parser';
import { ThemeColors, THEME_COLORS, DEFAULT_NODE_COLORS } from '@verdant/themes';
import { computeLayout, computePositionsForNewNodes, LayoutType } from './layout';
import {
  readPersistedState,
  writePersistedState,
} from './store.persistence';
import { sanitizePosition } from './utils';

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(get: () => RendererState): void {
  if (typeof window === 'undefined') return;
  if (persistTimer !== null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const state = get();
    if (!state.ast) return;
    writePersistedState(
      state.ast,
      state.positions,
      state.selectedNodeId,
      state.themeName,
    );
  }, 300);
}

// ── Store interface ──

export interface RendererState {
  // Data
  ast: VrdAST | null;
  nodeIndex: Map<string, import('@verdant/parser').VrdNode>;
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
  ast: null,
  nodeIndex: new Map(),
  positions: {},
  diagnostics: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  draggingNodeId: null,
  themeName: 'moss',
  themeColors: THEME_COLORS['moss'],

  setAst: (ast, diagnostics = []) => {
    const layoutType = (ast.config.layout as LayoutType) || 'auto';
    const prevPositions = get().positions;
    const prevAst = get().ast;
    const persisted = readPersistedState(ast);

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

      // Restore persisted positions
      if (persisted?.positions) {
        for (const node of ast.nodes) {
          const saved = persisted.positions[node.id];
          if (saved && Array.isArray(saved) && saved.length === 3) {
            const [x, y, z] = saved;
            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
              finalPositions[node.id] = [x, y, z];
            }
          }
        }
      }

      // Compute layout for nodes missing persisted positions
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
          const safe = sanitizePosition(pos.x, pos.y, pos.z);
          finalPositions[node.id] = [safe.x, safe.y, safe.z];
        }
      }
    } else {
      finalPositions = { ...prevPositions };

      for (const id of removedIds) {
        delete finalPositions[id];
      }

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
        const safe = sanitizePosition(p.x, p.y, p.z);
        finalPositions[node.id] = [safe.x, safe.y, safe.z];
      }
    }

    // Theme
    const configTheme =
      (ast.config.theme as string) ||
      persisted?.themeName ||
      get().themeName;
    const themeColors = THEME_COLORS[configTheme] || THEME_COLORS['moss'];

    // Selection preservation
    const prevSelected = get().selectedNodeId;
    const selectionValid = prevSelected ? nextIds.has(prevSelected) : false;
    const persistedSelected = persisted?.selectedNodeId;
    const persistedSelectionValid = persistedSelected
      ? nextIds.has(persistedSelected)
      : false;
    const finalSelectedNodeId: string | null = selectionValid
      ? prevSelected!
      : persistedSelectionValid
        ? persistedSelected!
        : null;

    // Build node index
    const nodeIndex = new Map<string, import('@verdant/parser').VrdNode>();
    for (const node of ast.nodes) {
      nodeIndex.set(node.id, node);
    }

    set({
      ast,
      nodeIndex,
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

  updateNodePosition: (id, position) => {
    set((state) => ({
      positions: { ...state.positions, [id]: position },
    }));
    schedulePersist(get);
  },

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