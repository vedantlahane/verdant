import * as THREE from 'three';

export type NodeStatus = 'healthy' | 'warning' | 'error' | 'unknown';

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
 * Creates a set of MeshStandardMaterial instances for each NodeStatus.
 *
 * - healthy: green tint, no emissive
 * - warning: amber tint, emissive set for pulsing glow (handled by BaseNode)
 * - error: red tint, emissive set at higher intensity than warning
 * - unknown: grey tint, no emissive
 */
export function createStatusMaterials(
  config?: StatusColorConfig
): Record<NodeStatus, THREE.MeshStandardMaterial> {
  const colors = { ...DEFAULT_COLORS, ...config };

  const healthy = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.healthy),
  });

  const warning = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.warning),
    emissive: new THREE.Color(colors.warning),
    emissiveIntensity: 0.4,
  });

  const error = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.error),
    emissive: new THREE.Color(colors.error),
    emissiveIntensity: 0.8,
  });

  const unknown = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.unknown),
  });

  return { healthy, warning, error, unknown };
}
