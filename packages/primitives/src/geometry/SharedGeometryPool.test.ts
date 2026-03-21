import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import { SharedGeometryPool } from './SharedGeometryPool';

// Helper: create a mock BufferGeometry with a spy on dispose
function mockGeometry(): THREE.BufferGeometry & { dispose: ReturnType<typeof vi.fn> } {
  const geo = new THREE.BufferGeometry();
  geo.dispose = vi.fn();
  return geo as THREE.BufferGeometry & { dispose: ReturnType<typeof vi.fn> };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('SharedGeometryPool — unit tests', () => {
  it('returns the same geometry instance on repeated acquires', () => {
    const pool = new SharedGeometryPool();
    const geo = mockGeometry();
    const a = pool.acquire('box:1:1:1', () => geo);
    const b = pool.acquire('box:1:1:1', () => mockGeometry());
    expect(a).toBe(b);
    pool.dispose();
  });

  it('calls factory only once for the same key', () => {
    const pool = new SharedGeometryPool();
    const factory = vi.fn(() => mockGeometry());
    pool.acquire('sphere:1:16:16', factory);
    pool.acquire('sphere:1:16:16', factory);
    pool.acquire('sphere:1:16:16', factory);
    expect(factory).toHaveBeenCalledTimes(1);
    pool.dispose();
  });

  it('getStats reflects correct counts after acquires', () => {
    const pool = new SharedGeometryPool();
    pool.acquire('a', () => mockGeometry());
    pool.acquire('a', () => mockGeometry());
    pool.acquire('b', () => mockGeometry());
    const stats = pool.getStats();
    expect(stats.cachedCount).toBe(2);
    expect(stats.totalReferenceCount).toBe(3);
    pool.dispose();
  });

  it('release decrements refCount and disposes at zero', () => {
    const pool = new SharedGeometryPool();
    const geo = mockGeometry();
    pool.acquire('key', () => geo);
    pool.acquire('key', () => geo);
    pool.release('key');
    expect(geo.dispose).not.toHaveBeenCalled();
    expect(pool.getStats().cachedCount).toBe(1);
    pool.release('key');
    expect(geo.dispose).toHaveBeenCalledTimes(1);
    expect(pool.getStats().cachedCount).toBe(0);
  });

  it('dispose() clears all entries and calls dispose on each geometry', () => {
    const pool = new SharedGeometryPool();
    const geoA = mockGeometry();
    const geoB = mockGeometry();
    pool.acquire('a', () => geoA);
    pool.acquire('b', () => geoB);
    pool.dispose();
    expect(geoA.dispose).toHaveBeenCalledTimes(1);
    expect(geoB.dispose).toHaveBeenCalledTimes(1);
    expect(pool.getStats().cachedCount).toBe(0);
  });

  it('double-release warns and does not throw', () => {
    const pool = new SharedGeometryPool();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    pool.acquire('k', () => mockGeometry());
    pool.release('k'); // refCount → 0, removed
    pool.release('k'); // unknown key
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('SharedGeometryPool — property tests', () => {
  // Feature: production-grade-primitives, Property 1: Geometry pool deduplication and reference counting
  it('holds exactly one geometry instance for N concurrent acquires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (n) => {
          const pool = new SharedGeometryPool();
          const factory = () => new THREE.BoxGeometry(1, 1, 1);
          const results: THREE.BufferGeometry[] = [];
          for (let i = 0; i < n; i++) {
            results.push(pool.acquire('box:1:1:1', factory));
          }
          const stats = pool.getStats();
          // Exactly one cached geometry
          expect(stats.cachedCount).toBe(1);
          // Reference count equals number of acquires
          expect(stats.totalReferenceCount).toBe(n);
          // All returned references are the same object
          const first = results[0];
          for (const geo of results) {
            expect(geo).toBe(first);
          }
          pool.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: production-grade-primitives, Property 1 (multi-key): stats aggregate correctly across distinct keys
  it('totalReferenceCount equals sum of all individual acquires across distinct keys', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            acquires: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (entries) => {
          // Deduplicate keys so each key has a deterministic total
          const keyMap = new Map<string, number>();
          for (const { key, acquires } of entries) {
            keyMap.set(key, (keyMap.get(key) ?? 0) + acquires);
          }

          const pool = new SharedGeometryPool();
          for (const [key, total] of keyMap) {
            for (let i = 0; i < total; i++) {
              pool.acquire(key, () => new THREE.BoxGeometry(1, 1, 1));
            }
          }

          const stats = pool.getStats();
          const expectedTotal = [...keyMap.values()].reduce((a, b) => a + b, 0);
          expect(stats.cachedCount).toBe(keyMap.size);
          expect(stats.totalReferenceCount).toBe(expectedTotal);
          pool.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: production-grade-primitives, Property 2: Geometry pool disposal on zero references
  it('disposes geometry exactly once when released N times after N acquires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (n) => {
          const pool = new SharedGeometryPool();
          const geo = mockGeometry();
          for (let i = 0; i < n; i++) {
            pool.acquire('sphere:1:32:32', () => geo);
          }
          // Release n-1 times — geometry should NOT be disposed yet
          for (let i = 0; i < n - 1; i++) {
            pool.release('sphere:1:32:32');
          }
          expect(geo.dispose).not.toHaveBeenCalled();
          expect(pool.getStats().cachedCount).toBe(1);

          // Final release — geometry should be disposed exactly once and key removed
          pool.release('sphere:1:32:32');
          expect(geo.dispose).toHaveBeenCalledTimes(1);
          expect(pool.getStats().cachedCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
