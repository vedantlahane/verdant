// primitives/src/materials/StatusMaterials.ts

import { Color, MeshStandardMaterial } from 'three';
import type { NodeStatus } from '../types';

export type { NodeStatus };

export interface StatusColorConfig {
  healthy?: string;
  warning?: string;
  error?: string;
  unknown?: string;
}

const DEFAULT_COLORS: Required<StatusColorConfig> = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  unknown: '#6b7280',
};

/**
 * Creates a set of `MeshStandardMaterial` instances, one per `NodeStatus`.
 *
 * | Status    | Color  | Emissive | Intensity | Notes                          |
 * |-----------|--------|----------|-----------|--------------------------------|
 * | healthy   | green  | none     | 0         | Solid, calm                    |
 * | warning   | amber  | amber    | 0.4       | Subtle glow (pulsable by node) |
 * | error     | red    | red      | 0.8       | Strong glow (pulsable by node) |
 * | unknown   | grey   | none     | 0         | Muted, inactive                |
 *
 * @param config - Optional color overrides per status.
 * @returns A `Record<NodeStatus, MeshStandardMaterial>`.
 */
export function createStatusMaterials(
  config?: StatusColorConfig,
): Record<NodeStatus, MeshStandardMaterial> {
  const c = { ...DEFAULT_COLORS, ...config };

  const base = {
    metalness: 0.1,
    roughness: 0.6,
  };

  return {
    healthy: new MeshStandardMaterial({
      ...base,
      color: new Color(c.healthy),
    }),
    warning: new MeshStandardMaterial({
      ...base,
      color: new Color(c.warning),
      emissive: new Color(c.warning),
      emissiveIntensity: 0.4,
    }),
    error: new MeshStandardMaterial({
      ...base,
      color: new Color(c.error),
      emissive: new Color(c.error),
      emissiveIntensity: 0.8,
    }),
    unknown: new MeshStandardMaterial({
      ...base,
      color: new Color(c.unknown),
    }),
  };
}

/**
 * Disposes all materials in a status materials record.
 * Safe to call multiple times.
 */
export function disposeStatusMaterials(
  materials: Record<NodeStatus, MeshStandardMaterial>,
): void {
  for (const mat of Object.values(materials)) {
    if (mat && typeof mat.dispose === 'function') {
      mat.dispose();
    }
  }
}

export const StatusMaterials = {
  createStatusMaterials,
  disposeStatusMaterials,
};