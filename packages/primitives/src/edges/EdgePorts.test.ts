import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import { resolvePort, resolveEdgeEndpoints } from './EdgePorts';
import type { NodePort } from '../shapes/ShapeDefinition';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePort(name: string, x: number, y: number, z: number): NodePort {
  return {
    name,
    localPosition: new THREE.Vector3(x, y, z),
    facingDirection: new THREE.Vector3(0, 1, 0),
  };
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('resolvePort', () => {
  it('returns correct world position for a known port', () => {
    const nodePos = new THREE.Vector3(1, 2, 3);
    const port = makePort('output', 0.5, 0, 0);
    const result = resolvePort('node-1', 'output', nodePos, [port]);
    expect(result.x).toBeCloseTo(1.5);
    expect(result.y).toBeCloseTo(2);
    expect(result.z).toBeCloseTo(3);
  });

  it('falls back to node center for unknown port name', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nodePos = new THREE.Vector3(4, 5, 6);
    const result = resolvePort('node-1', 'nonexistent', nodePos, []);
    expect(result.x).toBeCloseTo(4);
    expect(result.y).toBeCloseTo(5);
    expect(result.z).toBeCloseTo(6);
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('does not mutate the original nodeWorldPosition', () => {
    const nodePos = new THREE.Vector3(1, 2, 3);
    const port = makePort('in', 10, 10, 10);
    resolvePort('n', 'in', nodePos, [port]);
    expect(nodePos.x).toBe(1);
    expect(nodePos.y).toBe(2);
    expect(nodePos.z).toBe(3);
  });
});

describe('resolveEdgeEndpoints', () => {
  it('resolves both endpoints when ports exist', () => {
    const positions = new Map([
      ['a', new THREE.Vector3(0, 0, 0)],
      ['b', new THREE.Vector3(10, 0, 0)],
    ]);
    const portsMap = new Map([
      ['a', [makePort('out', 0.5, 0, 0)]],
      ['b', [makePort('in', -0.5, 0, 0)]],
    ]);
    const { from, to } = resolveEdgeEndpoints('a', 'out', 'b', 'in', positions, portsMap);
    expect(from.x).toBeCloseTo(0.5);
    expect(to.x).toBeCloseTo(9.5);
  });

  it('falls back to node center when no port name is given', () => {
    const positions = new Map([
      ['a', new THREE.Vector3(1, 2, 3)],
      ['b', new THREE.Vector3(4, 5, 6)],
    ]);
    const portsMap = new Map<string, NodePort[]>();
    const { from, to } = resolveEdgeEndpoints('a', undefined, 'b', undefined, positions, portsMap);
    expect(from.x).toBeCloseTo(1);
    expect(to.x).toBeCloseTo(4);
  });
});

// ---------------------------------------------------------------------------
// Property-based test — Property 23
// ---------------------------------------------------------------------------

describe('Property 23: Port fallback on unknown port name', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Feature: production-grade-primitives, Property 23: Port fallback on unknown port name
  it('computed path origin/terminus equals node center when port is not found — no NaN, no throw', () => {
    fc.assert(
      fc.property(
        // node world position
        fc.tuple(
          fc.float({ noNaN: true, min: -1000, max: 1000 }),
          fc.float({ noNaN: true, min: -1000, max: 1000 }),
          fc.float({ noNaN: true, min: -1000, max: 1000 }),
        ),
        // defined port names on the node (may be empty)
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 5 }),
        // a port name that is guaranteed NOT to be in the defined list
        fc.string({ minLength: 1, maxLength: 10 }),
        ([nx, ny, nz], definedPortNames, unknownSuffix) => {
          const nodePos = new THREE.Vector3(nx, ny, nz);

          // Ensure the unknown port name is truly absent
          const unknownPort = `__unknown__${unknownSuffix}`;
          const ports: NodePort[] = definedPortNames
            .filter((n) => n !== unknownPort)
            .map((n) => makePort(n, 0.1, 0.1, 0.1));

          const result = resolvePort('test-node', unknownPort, nodePos, ports);

          // Must equal node center
          expect(result.x).toBeCloseTo(nx, 5);
          expect(result.y).toBeCloseTo(ny, 5);
          expect(result.z).toBeCloseTo(nz, 5);

          // Must be finite (no NaN)
          expect(Number.isFinite(result.x)).toBe(true);
          expect(Number.isFinite(result.y)).toBe(true);
          expect(Number.isFinite(result.z)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
