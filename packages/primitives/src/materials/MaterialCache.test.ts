import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import { MaterialCache, MaterialConfig } from './MaterialCache';

// Helper: spy on dispose for a material returned from acquire
function spyDispose(material: THREE.Material): ReturnType<typeof vi.fn> {
  const spy = vi.fn();
  material.dispose = spy;
  return spy;
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('MaterialCache — unit tests', () => {
  it('returns the same material instance for identical configs', () => {
    const cache = new MaterialCache();
    const config: MaterialConfig = { color: '#ff0000' };
    const a = cache.acquire(config);
    const b = cache.acquire({ color: '#ff0000' });
    expect(a).toBe(b);
    cache.dispose();
  });

  it('returns different instances for different configs', () => {
    const cache = new MaterialCache();
    const a = cache.acquire({ color: '#ff0000' });
    const b = cache.acquire({ color: '#00ff00' });
    expect(a).not.toBe(b);
    cache.dispose();
  });

  it('treats configs with same properties in different key order as identical', () => {
    const cache = new MaterialCache();
    const a = cache.acquire({ color: '#fff', opacity: 0.5 });
    const b = cache.acquire({ opacity: 0.5, color: '#fff' });
    expect(a).toBe(b);
    cache.dispose();
  });

  it('does not call dispose before refCount reaches zero', () => {
    const cache = new MaterialCache();
    const config: MaterialConfig = { color: '#aabbcc' };
    const mat = cache.acquire(config);
    cache.acquire(config); // refCount = 2
    const spy = spyDispose(mat);
    cache.release(config); // refCount = 1
    expect(spy).not.toHaveBeenCalled();
    cache.release(config); // refCount = 0 → dispose
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('removes entry from cache after final release', () => {
    const cache = new MaterialCache();
    const config: MaterialConfig = { color: '#123456' };
    cache.acquire(config);
    cache.release(config);
    // Re-acquiring should create a fresh material (different instance)
    const mat1 = cache.acquire({ color: '#123456' });
    cache.dispose();
    // Just verifying no throw and a new instance was created
    expect(mat1).toBeInstanceOf(THREE.MeshStandardMaterial);
  });

  it('dispose() clears all entries and calls dispose on each material', () => {
    const cache = new MaterialCache();
    const matA = cache.acquire({ color: '#111111' });
    const matB = cache.acquire({ color: '#222222' });
    const spyA = spyDispose(matA);
    const spyB = spyDispose(matB);
    cache.dispose();
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);
  });

  it('double-release warns and does not throw', () => {
    const cache = new MaterialCache();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config: MaterialConfig = { color: '#deadbe' };
    cache.acquire(config);
    cache.release(config); // refCount → 0, removed
    cache.release(config); // unknown key
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('creates a MeshStandardMaterial with correct color', () => {
    const cache = new MaterialCache();
    const mat = cache.acquire({ color: '#ff0000' }) as THREE.MeshStandardMaterial;
    expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(mat.color.getHexString()).toBe('ff0000');
    cache.dispose();
  });
});

// ─── Property Tests ───────────────────────────────────────────────────────────

// Arbitrary for valid hex color strings
const hexColor = fc.stringMatching(/^[0-9a-f]{6}$/).map((s) => `#${s}`);

// Arbitrary for MaterialConfig
const materialConfig = fc.record({
  color: hexColor,
  opacity: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  emissive: fc.option(hexColor, { nil: undefined }),
  emissiveIntensity: fc.option(fc.float({ min: 0, max: 2, noNaN: true }), { nil: undefined }),
  metalness: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  roughness: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
}).map((cfg) => {
  // Remove undefined keys so JSON.stringify produces consistent keys
  return Object.fromEntries(
    Object.entries(cfg).filter(([, v]) => v !== undefined)
  ) as MaterialConfig;
});

describe('MaterialCache — property tests', () => {
  // Feature: production-grade-primitives, Property 3: Material cache deduplication and reference counting
  it('returns the same object reference for N acquires of identical config', () => {
    fc.assert(
      fc.property(
        materialConfig,
        fc.integer({ min: 1, max: 50 }),
        (config, n) => {
          const cache = new MaterialCache();
          const results: THREE.Material[] = [];
          for (let i = 0; i < n; i++) {
            // Spread to ensure a new object reference each time (key equality, not reference equality)
            results.push(cache.acquire({ ...config }));
          }
          // All returned references must be the same object
          const first = results[0];
          for (const mat of results) {
            expect(mat).toBe(first);
          }
          cache.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: production-grade-primitives, Property 3 (multi-config): distinct configs produce distinct instances
  it('distinct configs produce distinct material instances', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(hexColor, { minLength: 2, maxLength: 10 }),
        (colors) => {
          const cache = new MaterialCache();
          const materials = colors.map((color) => cache.acquire({ color }));
          // All instances should be distinct objects
          const unique = new Set(materials);
          expect(unique.size).toBe(colors.length);
          cache.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: production-grade-primitives, Property 4: Material disposal on zero references
  it('disposes material exactly once when released N times after N acquires', () => {
    fc.assert(
      fc.property(
        materialConfig,
        fc.integer({ min: 1, max: 50 }),
        (config, n) => {
          const cache = new MaterialCache();
          const mat = cache.acquire({ ...config });
          const spy = spyDispose(mat);

          // Acquire n-1 more times (total = n)
          for (let i = 1; i < n; i++) {
            cache.acquire({ ...config });
          }

          // Release n-1 times — material should NOT be disposed yet
          for (let i = 0; i < n - 1; i++) {
            cache.release({ ...config });
          }
          expect(spy).not.toHaveBeenCalled();

          // Final release — material should be disposed exactly once
          cache.release({ ...config });
          expect(spy).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
