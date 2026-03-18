import { create } from 'zustand';
import { VrdAST, VrdDiagnostic } from '@repo/parser';
import { computeLayout, computePositionsForNewNodes, LayoutType } from './layout';
import { ThemeColors, THEME_COLORS, DEFAULT_NODE_COLORS } from '@repo/themes';

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
      // Full layout on first load
      const computed = computeLayout(
        ast.nodes,
        ast.edges,
        layoutType,
        ast.groups,
      );
      finalPositions = {};
      for (const [id, pos] of computed.entries()) {
        finalPositions[id] = [pos.x, pos.y, pos.z];
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

    const configTheme = (ast.config.theme as string) || get().themeName;
    const themeColors = THEME_COLORS[configTheme] || THEME_COLORS['moss'];

    // Preserve selection only if node still exists
    const prevSelected = get().selectedNodeId;
    const selectionValid = prevSelected
      ? nextIds.has(prevSelected)
      : false;

    set({
      ast,
      positions: finalPositions,
      diagnostics,
      selectedNodeId: selectionValid ? prevSelected : null,
      hoveredNodeId: null,
      themeName: configTheme,
      themeColors,
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),
  setDraggingNode: (id) => set({ draggingNodeId: id }),

  // Called every frame during drag — only update positions map
  updateNodePosition: (id, position) =>
    set((state) => ({
      positions: { ...state.positions, [id]: position },
    })),

  setTheme: (name) => {
    const themeColors = THEME_COLORS[name] || THEME_COLORS['moss'];
    set({ themeName: name, themeColors });
  },

  getNodeColor: (type, customColor) => {
    if (customColor) return customColor;
    const { themeColors } = get();
    return themeColors.nodeDefaults?.[type] ?? themeColors.accent;
  },
}));

export { THEME_COLORS as THEMES, DEFAULT_NODE_COLORS };