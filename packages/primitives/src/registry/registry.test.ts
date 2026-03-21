import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { NodeRegistry } from './NodeRegistry';
import { ShapeRegistry, InvalidShapeDefinitionError } from './ShapeRegistry';
import { PluginSystem, PluginConflictError } from './PluginSystem';
import type { VerdantPlugin } from '../provider/PrimitivesConfig';
import type { PluginRegistry } from './PluginSystem';
import type { ShapeDefinition } from '../shapes/ShapeDefinition';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlugin(
  name: string,
  nodeTypes: string[],
  version = '1.0.0'
): VerdantPlugin {
  return {
    name,
    version,
    install(registry: PluginRegistry) {
      for (const type of nodeTypes) {
        registry.registerNode(type, vi.fn() as any);
      }
    },
  };
}

function makeShapeDefinition(name: string): ShapeDefinition {
  return {
    name,
    geometryFactory: () => new THREE.BoxGeometry(1, 1, 1),
    defaultPorts: [],
    defaultMaterialConfig: { color: '#ffffff' },
  };
}

function makePluginSystem() {
  const nodeRegistry = new NodeRegistry();
  const shapeRegistry = new ShapeRegistry();
  return new PluginSystem(nodeRegistry, shapeRegistry);
}

// ---------------------------------------------------------------------------
// Unit tests — NodeRegistry
// ---------------------------------------------------------------------------

describe('NodeRegistry', () => {
  it('registers and retrieves a component by type', () => {
    const reg = new NodeRegistry();
    const comp = vi.fn() as any;
    reg.register('server', comp);
    expect(reg.get('server')).toBe(comp);
  });

  it('returns undefined for unknown type', () => {
    const reg = new NodeRegistry();
    expect(reg.get('unknown')).toBeUndefined();
  });

  it('list() returns all registered type keys', () => {
    const reg = new NodeRegistry();
    reg.register('a', vi.fn() as any);
    reg.register('b', vi.fn() as any);
    expect(reg.list().sort()).toEqual(['a', 'b']);
  });

  it('overwriting a type replaces the component', () => {
    const reg = new NodeRegistry();
    const comp1 = vi.fn() as any;
    const comp2 = vi.fn() as any;
    reg.register('x', comp1);
    reg.register('x', comp2);
    expect(reg.get('x')).toBe(comp2);
  });
});

// ---------------------------------------------------------------------------
// Unit tests — ShapeRegistry
// ---------------------------------------------------------------------------

describe('ShapeRegistry', () => {
  it('registers and retrieves a shape definition', () => {
    const reg = new ShapeRegistry();
    const def = makeShapeDefinition('cube');
    reg.register('cube', def);
    expect(reg.get('cube')).toBe(def);
  });

  it('returns undefined for unknown shape', () => {
    const reg = new ShapeRegistry();
    expect(reg.get('unknown')).toBeUndefined();
  });

  it('list() returns all registered shape names', () => {
    const reg = new ShapeRegistry();
    reg.register('cube', makeShapeDefinition('cube'));
    reg.register('sphere', makeShapeDefinition('sphere'));
    expect(reg.list().sort()).toEqual(['cube', 'sphere']);
  });

  it('throws InvalidShapeDefinitionError when geometryFactory is missing', () => {
    const reg = new ShapeRegistry();
    const bad = { name: 'bad', defaultPorts: [], defaultMaterialConfig: { color: '#fff' } } as any;
    expect(() => reg.register('bad', bad)).toThrow(InvalidShapeDefinitionError);
  });
});

// ---------------------------------------------------------------------------
// Unit tests — PluginSystem
// ---------------------------------------------------------------------------

describe('PluginSystem', () => {
  it('installs a plugin and lists it', () => {
    const ps = makePluginSystem();
    ps.install(makePlugin('my-plugin', ['custom-node']));
    expect(ps.listPlugins()).toEqual([{ name: 'my-plugin', version: '1.0.0' }]);
  });

  it('throws PluginConflictError when two plugins register the same node type', () => {
    const ps = makePluginSystem();
    ps.install(makePlugin('plugin-a', ['shared-type']));
    expect(() => ps.install(makePlugin('plugin-b', ['shared-type']))).toThrow(PluginConflictError);
  });

  it('conflict error message identifies key and both plugin names', () => {
    const ps = makePluginSystem();
    ps.install(makePlugin('alpha', ['conflict-key']));
    let caught: Error | null = null;
    try {
      ps.install(makePlugin('beta', ['conflict-key']));
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught!.message).toContain('conflict-key');
    expect(caught!.message).toContain('alpha');
    expect(caught!.message).toContain('beta');
  });

  it('listPlugins returns names and versions of all installed plugins', () => {
    const ps = makePluginSystem();
    ps.install(makePlugin('p1', ['t1'], '1.0.0'));
    ps.install(makePlugin('p2', ['t2'], '2.3.4'));
    expect(ps.listPlugins()).toEqual([
      { name: 'p1', version: '1.0.0' },
      { name: 'p2', version: '2.3.4' },
    ]);
  });

  it('registerShape delegates to ShapeRegistry', () => {
    const nodeRegistry = new NodeRegistry();
    const shapeRegistry = new ShapeRegistry();
    const ps = new PluginSystem(nodeRegistry, shapeRegistry);
    const plugin: VerdantPlugin = {
      name: 'shape-plugin',
      version: '1.0.0',
      install(registry) {
        registry.registerShape('custom-shape', makeShapeDefinition('custom-shape'));
      },
    };
    ps.install(plugin);
    expect(shapeRegistry.get('custom-shape')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Property 14: Plugin conflict detection
// Feature: production-grade-primitives, Property 14: Plugin conflict detection
// ---------------------------------------------------------------------------

describe('Property 14: Plugin conflict detection', () => {
  it('second registerNode call for same key throws PluginConflictError identifying key and both plugin names', () => {
    // Feature: production-grade-primitives, Property 14: Plugin conflict detection
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (nodeType, pluginNameA, pluginNameB) => {
          // Ensure plugin names are distinct to avoid same-plugin re-registration
          const nameA = pluginNameA;
          const nameB = pluginNameB === pluginNameA ? pluginNameB + '_2' : pluginNameB;

          const ps = makePluginSystem();
          ps.install(makePlugin(nameA, [nodeType]));

          let threw = false;
          let errorMessage = '';
          try {
            ps.install(makePlugin(nameB, [nodeType]));
          } catch (e) {
            threw = true;
            errorMessage = (e as Error).message;
          }

          // Must throw
          if (!threw) return false;
          // Message must contain the conflicting key and both plugin names
          return (
            errorMessage.includes(nodeType) &&
            errorMessage.includes(nameA) &&
            errorMessage.includes(nameB)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Plugin registry instance isolation
// Feature: production-grade-primitives, Property 15: Plugin registry instance isolation
// ---------------------------------------------------------------------------

describe('Property 15: Plugin registry instance isolation', () => {
  it('registering a node type in one PluginSystem does not affect another', () => {
    // Feature: production-grade-primitives, Property 15: Plugin registry instance isolation
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (nodeTypeA, nodeTypeB) => {
          // Use distinct types to avoid accidental overlap
          const typeA = 'a_' + nodeTypeA;
          const typeB = 'b_' + nodeTypeB;

          const nodeReg1 = new NodeRegistry();
          const shapeReg1 = new ShapeRegistry();
          const ps1 = new PluginSystem(nodeReg1, shapeReg1);

          const nodeReg2 = new NodeRegistry();
          const shapeReg2 = new ShapeRegistry();
          const ps2 = new PluginSystem(nodeReg2, shapeReg2);

          ps1.install(makePlugin('plugin-1', [typeA]));
          ps2.install(makePlugin('plugin-2', [typeB]));

          // typeA registered in ps1 must not appear in ps2's nodeRegistry
          const isolatedFromPs2 = nodeReg2.get(typeA) === undefined;
          // typeB registered in ps2 must not appear in ps1's nodeRegistry
          const isolatedFromPs1 = nodeReg1.get(typeB) === undefined;

          return isolatedFromPs2 && isolatedFromPs1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
