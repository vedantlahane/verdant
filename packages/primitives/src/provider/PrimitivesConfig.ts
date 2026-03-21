import type { StatusColorConfig } from '../materials/StatusMaterials';

export type { StatusColorConfig };

export interface PostProcessingConfig {
  enabled: boolean;
  bloom?: {
    intensity?: number;
    threshold?: number;
    radius?: number;
  };
  outline?: {
    color?: string;
    thickness?: number;
  };
}

export interface MinimapConfig {
  enabled: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Forward declaration — VerdantPlugin is defined in registry/PluginSystem.ts (Sprint 1)
// Using a loose type here so the config shape is established without a circular dep.
export interface VerdantPlugin {
  name: string;
  version: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  install(registry: any): void;
}

export interface PrimitivesConfig {
  maxUndoHistory?: number;
  statusColors?: StatusColorConfig;
  postProcessing?: PostProcessingConfig;
  minimap?: MinimapConfig;
  plugins?: VerdantPlugin[];
}
