import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import {
  createStatusMaterials,
  NodeStatus,
  StatusColorConfig,
} from './StatusMaterials';

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('createStatusMaterials — unit tests', () => {
  it('returns a material for each NodeStatus', () => {
    const materials = createStatusMaterials();
    expect(materials.healthy).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(materials.warning).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(materials.error).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(materials.unknown).toBeInstanceOf(THREE.MeshStandardMaterial);
  });

  it('uses default colors when no config is provided', () => {
    const materials = createStatusMaterials();
    expect(materials.healthy.color.getHexString()).toBe('22c55e');
    expect(materials.warning.color.getHexString()).toBe('f59e0b');
    expect(materials.error.color.getHexString()).toBe('ef4444');
    expect(materials.unknown.color.getHexString()).toBe('6b7280');
  });

  it('uses custom colors when config is provided', () => {
    const config: StatusColorConfig = {
      healthy: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      unknown: '#ffffff',
    };
    const materials = createStatusMaterials(config);
    expect(materials.healthy.color.getHexString()).toBe('00ff00');
    expect(materials.warning.color.getHexString()).toBe('ffff00');
    expect(materials.error.color.getHexString()).toBe('ff0000');
    expect(materials.unknown.color.getHexString()).toBe('ffffff');
  });

  it('merges partial config with defaults', () => {
    const materials = createStatusMaterials({ healthy: '#aabbcc' });
    expect(materials.healthy.color.getHexString()).toBe('aabbcc');
    // Other statuses should still use defaults
    expect(materials.warning.color.getHexString()).toBe('f59e0b');
    expect(materials.error.color.getHexString()).toBe('ef4444');
    expect(materials.unknown.color.getHexString()).toBe('6b7280');
  });

  it('warning material has emissive color set', () => {
    const materials = createStatusMaterials();
    // emissive should be non-black (i.e., the warning color)
    expect(materials.warning.emissive.getHexString()).toBe('f59e0b');
    expect(materials.warning.emissiveIntensity).toBeGreaterThan(0);
  });

  it('error material has emissive color set at higher intensity than warning', () => {
    const materials = createStatusMaterials();
    expect(materials.error.emissive.getHexString()).toBe('ef4444');
    expect(materials.error.emissiveIntensity).toBeGreaterThan(
      materials.warning.emissiveIntensity
    );
  });

  it('unknown material has no emissive (black emissive)', () => {
    const materials = createStatusMaterials();
    // Default emissive on MeshStandardMaterial is black (0x000000)
    expect(materials.unknown.emissive.getHexString()).toBe('000000');
  });

  it('healthy material has no emissive (black emissive)', () => {
    const materials = createStatusMaterials();
    expect(materials.healthy.emissive.getHexString()).toBe('000000');
  });

  it('each call returns distinct material instances', () => {
    const a = createStatusMaterials();
    const b = createStatusMaterials();
    expect(a.healthy).not.toBe(b.healthy);
    expect(a.warning).not.toBe(b.warning);
    expect(a.error).not.toBe(b.error);
    expect(a.unknown).not.toBe(b.unknown);
  });
});

// ─── Property Tests ───────────────────────────────────────────────────────────

const ALL_STATUSES: NodeStatus[] = ['healthy', 'warning', 'error', 'unknown'];

// Arbitrary for valid hex color strings
const hexColor = fc.stringMatching(/^[0-9a-f]{6}$/).map((s) => `#${s}`);

// Arbitrary for a full StatusColorConfig
const statusColorConfig = fc.record({
  healthy: hexColor,
  warning: hexColor,
  error: hexColor,
  unknown: hexColor,
});

// Arbitrary for a NodeStatus value
const nodeStatus = fc.constantFrom<NodeStatus>(...ALL_STATUSES);

describe('createStatusMaterials — property tests', () => {
  // Feature: production-grade-primitives, Property 27: Status material mapping
  it('material color matches configured status color for any NodeStatus', () => {
    fc.assert(
      fc.property(
        statusColorConfig,
        nodeStatus,
        (config: StatusColorConfig, status: NodeStatus) => {
          const materials = createStatusMaterials(config);
          const material = materials[status];

          // Parse the configured color to compare
          const expectedColor = new THREE.Color(config[status]);

          expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
          expect(material.color.r).toBeCloseTo(expectedColor.r, 5);
          expect(material.color.g).toBeCloseTo(expectedColor.g, 5);
          expect(material.color.b).toBeCloseTo(expectedColor.b, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
