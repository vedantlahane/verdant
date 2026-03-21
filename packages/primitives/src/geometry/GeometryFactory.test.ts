import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import { ShapeRegistry } from '../registry/ShapeRegistry';
import { SharedGeometryPool } from './SharedGeometryPool';
import { createGeometry, ShapeNotFoundError } from './GeometryFactory';
import { BUILTIN_SHAPE_DEFINITIONS } from '../shapes/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistryWithBuiltins(): ShapeRegistry {
  const registry = new ShapeRegistry();
  for (const def of BUILTIN_SHAPE_DEFINITIONS) {
    registry.register(def.name, def);
  }
  return registry;
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('GeometryFactory — unit tests', () => {
  it('returns a BufferGeometry for a registered shape', () => {
    const pool = new SharedGeometryPool();
    const registry = makeRegistryWithBuiltins();
    const geo = createGeometry('cube', pool, registry);
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
    pool.dispose();
  });

  it('throws ShapeNotFoundError for an unregistered shape', () => {
    const pool = new SharedGeometryPool();
    const registry = new ShapeRegistry();
    expect(() => createGeometry('nonexistent', pool, registry)).toThrow(ShapeNotFoundError);
    pool.dispose();
  });

  it('error message includes the shape name', () => {
    const pool = new SharedGeometryPool();
    const registry = new ShapeRegistry();
    let caught: Error | null = null;
    try {
      createGeometry('mystery-shape', pool, registry);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught!.message).toContain('mystery-shape');
    pool.dispose();
  });

  it('delegates to pool — same shape name returns same geometry instance', () => {
    const pool = new SharedGeometryPool();
    const registry = makeRegistryWithBuiltins();
    const geo1 = createGeometry('sphere', pool, registry);
    const geo2 = createGeometry('sphere', pool, registry);
    expect(geo1).toBe(geo2);
    pool.dispose();
  });

  it('uses deterministic key including params', () => {
    const pool = new SharedGeometryPool();
    const registry = makeRegistryWithBuiltins();
    const geoA = createGeometry('cube', pool, registry, { width: 1, height: 1, depth: 1 });
    const geoB = createGeometry('cube', pool, registry, { width: 2, height: 2, depth: 2 });
    // Different params → different geometry instances
    expect(geoA).not.toBe(geoB);
    pool.dispose();
  });

  it('all 14 built-in shapes produce a BufferGeometry', () => {
    const pool = new SharedGeometryPool();
    const registry = makeRegistryWithBuiltins();
    for (const def of BUILTIN_SHAPE_DEFINITIONS) {
      const geo = createGeometry(def.name, pool, registry);
      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
    }
    pool.dispose();
  });
});

// ---------------------------------------------------------------------------
// Property 5: Shape registry idempotent lookup
// Feature: production-grade-primitives, Property 5: Shape registry idempotent lookup
// Validates: Requirements 8.4
// ---------------------------------------------------------------------------

describe('Property 5: Shape registry idempotent lookup', () => {
  it('querying the ShapeRegistry twice with the same name returns equivalent ShapeDefinition objects', () => {
    // Feature: production-grade-primitives, Property 5: Shape registry idempotent lookup
    const registry = makeRegistryWithBuiltins();
    const names = registry.list();

    fc.assert(
      fc.property(
        fc.constantFrom(...names),
        (shapeName) => {
          const def1 = registry.get(shapeName);
          const def2 = registry.get(shapeName);

          // Both lookups must return a defined value
          if (!def1 || !def2) return false;

          // Same name
          if (def1.name !== def2.name) return false;

          // Same object reference (registry returns the same stored definition)
          if (def1 !== def2) return false;

          // Same number of default ports
          if (def1.defaultPorts.length !== def2.defaultPorts.length) return false;

          // Same geometry factory reference
          if (def1.geometryFactory !== def2.geometryFactory) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: All registered shapes produce valid geometry
// Feature: production-grade-primitives, Property 6: All registered shapes produce valid geometry
// Validates: Requirements 8.2
// ---------------------------------------------------------------------------

describe('Property 6: All registered shapes produce valid geometry', () => {
  it('GeometryFactory returns a valid BufferGeometry with non-empty position attribute for any registered shape', () => {
    // Feature: production-grade-primitives, Property 6: All registered shapes produce valid geometry
    const registry = makeRegistryWithBuiltins();
    const names = registry.list();

    fc.assert(
      fc.property(
        fc.constantFrom(...names),
        (shapeName) => {
          const pool = new SharedGeometryPool();
          const geo = createGeometry(shapeName, pool, registry);

          // Must be a BufferGeometry
          if (!(geo instanceof THREE.BufferGeometry)) {
            pool.dispose();
            return false;
          }

          // Must have a position attribute
          const position = geo.getAttribute('position');
          if (!position) {
            pool.dispose();
            return false;
          }

          // Position attribute must be non-empty
          if (position.count === 0) {
            pool.dispose();
            return false;
          }

          pool.dispose();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: All registered shapes declare valid default ports
// Feature: production-grade-primitives, Property 7: All registered shapes declare valid default ports
// Validates: Requirements 3.1, 8.3
// ---------------------------------------------------------------------------

describe('Property 7: All registered shapes declare valid default ports', () => {
  it('each ShapeDefinition defaultPorts has non-empty name, finite localPosition, and unit-length facingDirection', () => {
    // Feature: production-grade-primitives, Property 7: All registered shapes declare valid default ports
    const registry = makeRegistryWithBuiltins();
    const names = registry.list();

    fc.assert(
      fc.property(
        fc.constantFrom(...names),
        (shapeName) => {
          const def = registry.get(shapeName);
          if (!def) return false;

          for (const portDef of def.defaultPorts) {
            // Non-empty name
            if (!portDef.name || portDef.name.length === 0) return false;

            // Finite localPosition components
            const lp = portDef.localPosition;
            if (!isFinite(lp.x) || !isFinite(lp.y) || !isFinite(lp.z)) return false;

            // Unit-length facingDirection (within floating-point tolerance)
            const fd = portDef.facingDirection;
            if (!isFinite(fd.x) || !isFinite(fd.y) || !isFinite(fd.z)) return false;
            const len = fd.length();
            if (Math.abs(len - 1.0) > 1e-5) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
