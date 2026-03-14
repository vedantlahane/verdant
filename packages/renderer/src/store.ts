import { create } from 'zustand';
import { VrdAST, VrdDiagnostic } from '@repo/parser';
import { computeLayout, LayoutType } from './layout';

// ============================================
// Theme definitions (stub — will be full system)
// ============================================

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  nodeDefaults: Record<string, string>;
  edgeDefault: string;
}

const DEFAULT_NODE_COLORS: Record<string, string> = {
  server:   '#4287f5',
  database: '#42f554',
  cache:    '#f5a442',
  gateway:  '#a855f7',
  service:  '#64748b',
  user:     '#ec4899',
  client:   '#ec4899',
  cloud:    '#38bdf8',
  queue:    '#f59e0b',
  storage:  '#8b5cf6',
  monitor:  '#10b981',
};

const THEMES: Record<string, ThemeColors> = {
  moss: {
    background: '#0D1F17',
    surface: '#1A3328',
    text: '#B7E4C7',
    textMuted: '#4a6e5c',
    accent: '#52B788',
    accentLight: '#95D5B2',
    accentDark: '#2D6A4F',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#52B788',
  },
  sage: {
    background: '#1A1F1E',
    surface: '#2A302E',
    text: '#D4DDD6',
    textMuted: '#6B7B6F',
    accent: '#9CAF88',
    accentLight: '#B5C4A0',
    accentDark: '#7A9466',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#9CAF88',
  },
  fern: {
    background: '#0D1F17',
    surface: '#1A3328',
    text: '#B7E4C7',
    textMuted: '#4a6e5c',
    accent: '#52B788',
    accentLight: '#95D5B2',
    accentDark: '#2D6A4F',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#52B788',
  },
  bloom: {
    background: '#1A0A14',
    surface: '#2D1524',
    text: '#F9D5E8',
    textMuted: '#8B5A7A',
    accent: '#EC4899',
    accentLight: '#F472B6',
    accentDark: '#BE185D',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#EC4899',
  },
  ash: {
    background: '#FAFAFA',
    surface: '#F3F4F6',
    text: '#111827',
    textMuted: '#9CA3AF',
    accent: '#6B7280',
    accentLight: '#9CA3AF',
    accentDark: '#4B5563',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#6B7280',
  },
  dusk: {
    background: '#0F0A1A',
    surface: '#1C1433',
    text: '#DDD6FE',
    textMuted: '#6D5BA0',
    accent: '#A855F7',
    accentLight: '#C084FC',
    accentDark: '#7C3AED',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#A855F7',
  },
  stone: {
    background: '#111111',
    surface: '#1E1E1E',
    text: '#E5E7EB',
    textMuted: '#6B7280',
    accent: '#64748B',
    accentLight: '#94A3B8',
    accentDark: '#475569',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#64748B',
  },
  ember: {
    background: '#1A1008',
    surface: '#2D1E0F',
    text: '#FDE68A',
    textMuted: '#A07C3A',
    accent: '#F59E0B',
    accentLight: '#FBBF24',
    accentDark: '#D97706',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#F59E0B',
  },
  frost: {
    background: '#0A1628',
    surface: '#132240',
    text: '#BAE6FD',
    textMuted: '#4A7BA8',
    accent: '#38BDF8',
    accentLight: '#7DD3FC',
    accentDark: '#0284C7',
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: '#38BDF8',
  },
};

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
  themeColors: THEMES['moss'],

  setAst: (ast, diagnostics = []) => {
    const layoutType = (ast.config.layout as LayoutType) || 'auto';
    const computed = computeLayout(ast.nodes, ast.edges, layoutType, ast.groups);

    const positions: Record<string, [number, number, number]> = {};
    for (const [id, pos] of computed.entries()) {
      positions[id] = [pos.x, pos.y, pos.z];
    }

    // Apply theme from config if specified
    const configTheme = (ast.config.theme as string) || get().themeName;
    const themeColors = THEMES[configTheme] || THEMES['moss'];

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
    const themeColors = THEMES[name] || THEMES['moss'];
    set({ themeName: name, themeColors });
  },

  getNodeColor: (type, customColor) => {
    if (customColor) return customColor;
    const { themeColors } = get();
    return themeColors.nodeDefaults[type] || themeColors.accent;
  },
}));

export { THEMES, DEFAULT_NODE_COLORS };