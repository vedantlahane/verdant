// primitives/src/provider/PrimitivesConfig.ts

import type { StatusColorConfig } from '../materials/StatusMaterials';
import type { AnimationType, NodeStatus } from '../types';

export type { StatusColorConfig };

// ── Post-Processing ─────────────────────────────────────────

export interface BloomConfig {
  intensity?: number;   // @default 1.0
  threshold?: number;   // @default 0.5
  radius?: number;      // @default 0.4
}

export interface OutlineConfig {
  color?: string;       // @default "#ffffff"
  thickness?: number;   // @default 2
}

export interface PostProcessingConfig {
  enabled: boolean;
  bloom?: BloomConfig;
  outline?: OutlineConfig;
}

// ── Minimap ─────────────────────────────────────────────────

export interface MinimapConfig {
  enabled: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Scale factor relative to main viewport. @default 0.15 */
  scale?: number;
  /** Background opacity. @default 0.3 */
  opacity?: number;
}

// ── Grid / Snap ─────────────────────────────────────────────

export interface SnapConfig {
  enabled: boolean;
  /** Grid cell size in world units. @default 1.0 */
  gridSize?: number;
  /** Show alignment guides when dragging. @default true */
  showGuides?: boolean;
}

// ── Animation Defaults ──────────────────────────────────────

export interface AnimationConfig {
  /** Default enter animation for all nodes. @default undefined (instant) */
  defaultEnter?: AnimationType;
  /** Default exit animation for all nodes. @default undefined (instant) */
  defaultExit?: AnimationType;
  /** Default duration in ms. @default 300 */
  defaultDuration?: number;
  /** Layout transition duration in ms. @default 500 */
  layoutTransitionDuration?: number;
  /** Enable breathing animation globally. @default true */
  breathe?: boolean;
}

// ── Label Defaults ──────────────────────────────────────────

export interface LabelConfig {
  /** Label text color. @default "var(--verdant-label-color, #ffffff)" */
  color?: string;
  /** Label font size in px. @default 12 */
  fontSize?: number;
  /** Show background pill behind labels. @default false */
  showBackground?: boolean;
  /** Background color. @default "rgba(0,0,0,0.5)" */
  backgroundColor?: string;
}

// ── Plugin Interface ────────────────────────────────────────

/**
 * A plugin that can register custom node types, shapes, and context actions.
 * Installed via `PrimitivesConfig.plugins` or `PluginSystem.install()`.
 */
export interface VerdantPlugin {
  /** Unique plugin name. Used for conflict detection. */
  name: string;
  /** Semver version string. */
  version: string;
  /**
   * Called once during installation. Use the `registry` parameter to register
   * node types, shapes, and context menu actions.
   */
  install(registry: PluginRegistryAPI): void;
}

/**
 * API surface exposed to plugins during `install()`.
 * Defined here to break circular dependency with PluginSystem.
 */
export interface PluginRegistryAPI {
  registerNode(
    type: string,
    component: React.ComponentType<any>,
    options?: { displayName?: string; description?: string },
  ): void;
  registerShape(name: string, definition: any): void;
  registerContextAction(action: any): void;
}

// ── Root Config ─────────────────────────────────────────────

export interface PrimitivesConfig {
  /** Maximum undo history depth. @default 100 */
  maxUndoHistory?: number;
  /** Custom status indicator colors. */
  statusColors?: StatusColorConfig;
  /** Post-processing passes. Disabled by default. */
  postProcessing?: PostProcessingConfig;
  /** Minimap overlay. Disabled by default. */
  minimap?: MinimapConfig;
  /** Grid snapping. Disabled by default. */
  snap?: SnapConfig;
  /** Animation defaults. */
  animation?: AnimationConfig;
  /** Label styling defaults. */
  labels?: LabelConfig;
  /** Plugins to install on mount. */
  plugins?: VerdantPlugin[];
}