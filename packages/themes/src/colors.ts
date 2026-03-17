import type { Theme } from "./types";

export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  nodeDefaults: Record<string, string>;
  edgeDefault: string;
};

export const DEFAULT_NODE_COLORS: Record<string, string> = {
  server: "#4287f5",
  database: "#42f554",
  cache: "#f5a442",
  gateway: "#a855f7",
  service: "#64748b",
  user: "#ec4899",
  client: "#ec4899",
  cloud: "#38bdf8",
  queue: "#f59e0b",
  storage: "#8b5cf6",
  monitor: "#10b981",
};

export const THEME_COLORS: Record<string, ThemeColors> = {
  moss: {
    background: "#0D1F17",
    surface: "#1A3328",
    text: "#B7E4C7",
    textMuted: "#4a6e5c",
    accent: "#52B788",
    accentLight: "#95D5B2",
    accentDark: "#2D6A4F",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#52B788",
  },
  sage: {
    background: "#1A1F1E",
    surface: "#2A302E",
    text: "#D4DDD6",
    textMuted: "#6B7B6F",
    accent: "#9CAF88",
    accentLight: "#B5C4A0",
    accentDark: "#7A9466",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#9CAF88",
  },
  fern: {
    background: "#0D1F17",
    surface: "#1A3328",
    text: "#B7E4C7",
    textMuted: "#4a6e5c",
    accent: "#52B788",
    accentLight: "#95D5B2",
    accentDark: "#2D6A4F",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#52B788",
  },
  bloom: {
    background: "#1A0A14",
    surface: "#2D1524",
    text: "#F9D5E8",
    textMuted: "#8B5A7A",
    accent: "#EC4899",
    accentLight: "#F472B6",
    accentDark: "#BE185D",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#EC4899",
  },
  ash: {
    background: "#FAFAFA",
    surface: "#F3F4F6",
    text: "#111827",
    textMuted: "#9CA3AF",
    accent: "#6B7280",
    accentLight: "#9CA3AF",
    accentDark: "#4B5563",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#6B7280",
  },
  dusk: {
    background: "#0F0A1A",
    surface: "#1C1433",
    text: "#DDD6FE",
    textMuted: "#6D5BA0",
    accent: "#A855F7",
    accentLight: "#C084FC",
    accentDark: "#7C3AED",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#A855F7",
  },
  stone: {
    background: "#111111",
    surface: "#1E1E1E",
    text: "#E5E7EB",
    textMuted: "#6B7280",
    accent: "#64748B",
    accentLight: "#94A3B8",
    accentDark: "#475569",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#64748B",
  },
  ember: {
    background: "#1A1008",
    surface: "#2D1E0F",
    text: "#FDE68A",
    textMuted: "#A07C3A",
    accent: "#F59E0B",
    accentLight: "#FBBF24",
    accentDark: "#D97706",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#F59E0B",
  },
  frost: {
    background: "#0A1628",
    surface: "#132240",
    text: "#BAE6FD",
    textMuted: "#4A7BA8",
    accent: "#38BDF8",
    accentLight: "#7DD3FC",
    accentDark: "#0284C7",
    nodeDefaults: DEFAULT_NODE_COLORS,
    edgeDefault: "#38BDF8",
  },
};
