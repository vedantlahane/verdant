import { create } from 'zustand';
import { VrdAST, VrdDiagnostic } from '@repo/parser';
import { computeLayout, LayoutType } from './layout';
import { ThemeColors, THEME_COLORS, DEFAULT_NODE_COLORS } from '@repo/themes';

// ============================================
// Theme definitions (shared via @repo/themes)
// ============================================

// ============================================
// Store
// ============================================

export interface RendererState {
  // Data
  ast: VrdAST | null;
  positions: Record<string, [number, number, number]>;
  diagnostics: VrdDiagnostic[];

  // Interaction
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Theme
  themeName: string;
  themeColors: ThemeColors;

  // Actions
  setAst: (ast: VrdAST, diagnostics?: VrdDiagnostic[]) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  setTheme: (name: string) => void;
  getNodeColor: (type: string, customColor?: string) => string;
}

export const useRendererStore = create<RendererState>((set, get) => ({
  // Initial state
  ast: null,
  positions: {},
  diagnostics: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  themeName: 'moss',
  themeColors: THEME_COLORS['moss'],

  setAst: (ast, diagnostics = []) => {
    const layoutType = (ast.config.layout as LayoutType) || 'auto';
    const computed = computeLayout(ast.nodes, ast.edges, layoutType, ast.groups);

    const positions: Record<string, [number, number, number]> = {};
    for (const [id, pos] of computed.entries()) {
      positions[id] = [pos.x, pos.y, pos.z];
    }

    // Apply theme from config if specified
    const configTheme = (ast.config.theme as string) || get().themeName;
    const themeColors = THEME_COLORS[configTheme] || THEME_COLORS['moss'];

    set({
      ast,
      positions,
      diagnostics,
      selectedNodeId: null,
      hoveredNodeId: null,
      themeName: configTheme,
      themeColors,
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),

  setTheme: (name) => {
    const themeColors = THEME_COLORS[name] || THEME_COLORS['moss'];
    set({ themeName: name, themeColors });
  },

  getNodeColor: (type, customColor) => {
    if (customColor) return customColor;
    const { themeColors } = get();
    return themeColors.nodeDefaults[type] || themeColors.accent;
  },
}));

export { THEME_COLORS as THEMES, DEFAULT_NODE_COLORS };