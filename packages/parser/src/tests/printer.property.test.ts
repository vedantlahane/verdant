// Feature: integration-wiring-phase, Property 1
// Validates: Requirements 1.5, 2.7, 3.5, 4.7, 5.4, 6.8, 7.5, 8.4, 9.5

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { printVrd } from '../printer';
import { parseVrdSafe } from '../parser';
import type { VrdAST, VrdNode, VrdEdge, VrdGroup, VrdConfig } from '../types';
import {
  KNOWN_NODE_TYPES,
  VALID_SHAPES,
  VALID_STATUSES,
  VALID_ANIMATION_TYPES,
  VALID_ROUTING_TYPES,
  VALID_PORT_SIDES,
  VALID_BADGE_POSITIONS,
  VALID_LAYOUTS,
} from '../constants';

fc.configureGlobal({ numRuns: 100 });

// ── Helpers ──

const SHAPES = [...VALID_SHAPES] as string[];
const STATUSES = [...VALID_STATUSES] as string[];
const ANIMATION_TYPES = [...VALID_ANIMATION_TYPES] as string[];
const ROUTING_TYPES = [...VALID_ROUTING_TYPES] as string[];
const PORT_SIDES = [...VALID_PORT_SIDES] as string[];
const BADGE_POSITIONS = [...VALID_BADGE_POSITIONS] as string[];
const LAYOUTS = [...VALID_LAYOUTS] as string[];
const NODE_TYPES = [...KNOWN_NODE_TYPES] as string[];

/** Generate a valid node ID: starts with letter, alphanumeric + hyphens, 2-12 chars */
const nodeIdArb = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
    fc.stringMatching(/^[a-z0-9-]{1,11}$/),
  )
  .map(([first, rest]) => first + rest)
  .filter(id => !id.endsWith('-') && !id.includes('--'));

/** Generate a valid node type */
const nodeTypeArb = fc.constantFrom(...NODE_TYPES);

/** Generate a valid label string (no quotes, no newlines, no comment chars) */
const labelArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(s => !s.includes('"') && !s.includes('\n') && !s.includes('\r') && !s.includes('#') && s.trim().length > 0)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('#'));

/** Generate a valid hex color */
const hexColorArb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

/** Generate a valid port name (alphanumeric, no spaces) */
const portNameArb = fc
  .stringMatching(/^[a-z][a-z0-9]{1,8}$/)
  .filter(s => s.length >= 2);

/** Generate VrdNode with v2 props */
function nodeArb(idArb: fc.Arbitrary<string>): fc.Arbitrary<VrdNode> {
  return fc.record({
    id: idArb,
    type: nodeTypeArb,
    props: fc.record({
      shape: fc.option(fc.constantFrom(...SHAPES), { nil: undefined }),
      status: fc.option(fc.constantFrom(...STATUSES), { nil: undefined }),
      enterAnimation: fc.option(fc.constantFrom(...ANIMATION_TYPES), { nil: undefined }),
      exitAnimation: fc.option(fc.constantFrom(...ANIMATION_TYPES), { nil: undefined }),
      animationDuration: fc.option(
        fc.integer({ min: 0, max: 5000 }),
        { nil: undefined },
      ),
      badges: fc.option(
        fc.array(
          fc.record({
            position: fc.constantFrom(...BADGE_POSITIONS),
            content: labelArb,
          }),
          { minLength: 1, maxLength: 3 },
        ),
        { nil: undefined },
      ),
      ports: fc.option(
        fc.uniqueArray(
          fc.record({
            name: portNameArb,
            side: fc.constantFrom(...PORT_SIDES),
          }),
          { selector: p => p.name, minLength: 1, maxLength: 3 },
        ),
        { nil: undefined },
      ),
    }).map(props => {
      // Remove undefined keys so printVrd doesn't emit them
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) clean[k] = v;
      }
      return clean;
    }),
    groupId: fc.constant(undefined),
  }) as fc.Arbitrary<VrdNode>;
}

/** Generate VrdEdge with v2 props */
function edgeArb(fromId: string, toId: string): fc.Arbitrary<VrdEdge> {
  return fc.record({
    from: fc.constant(fromId),
    to: fc.constant(toId),
    props: fc.record({
      routing: fc.option(fc.constantFrom(...ROUTING_TYPES), { nil: undefined }),
      flow: fc.option(fc.boolean(), { nil: undefined }),
      flowSpeed: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
      flowCount: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
      flowColor: fc.option(hexColorArb, { nil: undefined }),
    }).map(props => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) clean[k] = v;
      }
      // flow-related props only make sense when flow is true
      if (!clean.flow) {
        delete clean.flowSpeed;
        delete clean.flowCount;
        delete clean.flowColor;
      }
      return clean;
    }),
  }) as fc.Arbitrary<VrdEdge>;
}

/** Generate VrdGroup with v2 props */
function groupArb(childIds: string[]): fc.Arbitrary<VrdGroup> {
  return fc.record({
    id: nodeIdArb,
    label: fc.option(labelArb, { nil: undefined }),
    children: fc.constant(childIds),
    groups: fc.constant([]),
    parentGroupId: fc.constant(undefined),
    props: fc.record({
      collapsed: fc.option(fc.boolean(), { nil: undefined }),
      layout: fc.option(fc.constantFrom(...LAYOUTS), { nil: undefined }),
    }).map(props => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) clean[k] = v;
      }
      return clean;
    }),
  }) as fc.Arbitrary<VrdGroup>;
}

/**
 * Generate a valid theme name: must not look like a number or boolean
 * so it round-trips correctly through the printer (unquoted) and parser.
 */
const themeArb = fc
  .constantFrom('dark', 'light', 'solarized', 'monokai', 'dracula', 'nord', 'gruvbox', 'catppuccin');

/** Generate a minimal VrdConfig */
const configArb: fc.Arbitrary<VrdConfig> = fc.record({
  theme: fc.option(themeArb, { nil: undefined }),
  layout: fc.option(fc.constantFrom(...LAYOUTS), { nil: undefined }),
}).map(cfg => {
  const clean: VrdConfig = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (v !== undefined) (clean as Record<string, unknown>)[k] = v;
  }
  return clean;
});

/** Generate a complete VrdAST with v2 props */
const astArb: fc.Arbitrary<VrdAST> = fc
  .array(nodeIdArb, { minLength: 1, maxLength: 5 })
  .chain(ids => {
    // Ensure unique IDs
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return fc.constant<VrdAST>({ config: {}, nodes: [], edges: [], groups: [] });
    }

    const nodesArb = fc.tuple(...uniqueIds.map(id => nodeArb(fc.constant(id))));

    // Generate edges between existing node pairs
    const edgesArb = uniqueIds.length >= 2
      ? fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: uniqueIds.length - 1 }),
            fc.integer({ min: 0, max: uniqueIds.length - 1 }),
          ).filter(([a, b]) => a !== b)
           .chain(([a, b]) => edgeArb(uniqueIds[a], uniqueIds[b])),
          { minLength: 0, maxLength: 3 },
        )
      : fc.constant<VrdEdge[]>([]);

    return fc.tuple(nodesArb, edgesArb, configArb).map(([nodesTuple, edges, config]) => {
      const nodes = Array.isArray(nodesTuple) ? nodesTuple : [nodesTuple];
      return {
        config,
        nodes: nodes as VrdNode[],
        edges,
        groups: [],
      };
    });
  });

// ── Structural equivalence helpers ──

function normalizeNodeProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function nodeEquivalent(original: VrdNode, reparsed: VrdNode): boolean {
  if (original.id !== reparsed.id) return false;
  if (original.type !== reparsed.type) return false;

  const op = normalizeNodeProps(original.props as Record<string, unknown>);
  const rp = normalizeNodeProps(reparsed.props as Record<string, unknown>);

  // Check v2 props
  const keys: (keyof typeof op)[] = [
    'shape', 'status', 'enterAnimation', 'exitAnimation', 'animationDuration',
  ];
  for (const key of keys) {
    if (op[key] !== rp[key]) return false;
  }

  // Check badges
  const origBadges = op.badges as Array<{ position: string; content: string }> | undefined;
  const repBadges = rp.badges as Array<{ position: string; content: string }> | undefined;
  if (!!origBadges !== !!repBadges) return false;
  if (origBadges && repBadges) {
    if (origBadges.length !== repBadges.length) return false;
    for (let i = 0; i < origBadges.length; i++) {
      if (origBadges[i].position !== repBadges[i].position) return false;
      if (origBadges[i].content !== repBadges[i].content) return false;
    }
  }

  // Check ports
  const origPorts = op.ports as Array<{ name: string; side: string }> | undefined;
  const repPorts = rp.ports as Array<{ name: string; side: string }> | undefined;
  if (!!origPorts !== !!repPorts) return false;
  if (origPorts && repPorts) {
    if (origPorts.length !== repPorts.length) return false;
    for (let i = 0; i < origPorts.length; i++) {
      if (origPorts[i].name !== repPorts[i].name) return false;
      if (origPorts[i].side !== repPorts[i].side) return false;
    }
  }

  return true;
}

function edgeEquivalent(original: VrdEdge, reparsed: VrdEdge): boolean {
  if (original.from !== reparsed.from) return false;
  if (original.to !== reparsed.to) return false;

  const op = original.props;
  const rp = reparsed.props;

  if (op.routing !== rp.routing) return false;
  if (!!op.flow !== !!rp.flow) return false;
  if (op.flow) {
    if (op.flowSpeed !== rp.flowSpeed) return false;
    if (op.flowCount !== rp.flowCount) return false;
    if (op.flowColor !== rp.flowColor) return false;
  }

  return true;
}

function groupEquivalent(original: VrdGroup, reparsed: VrdGroup): boolean {
  if (original.id !== reparsed.id) return false;
  if (original.props.collapsed !== reparsed.props.collapsed) return false;
  if (original.props.layout !== reparsed.props.layout) return false;
  return true;
}

// ── Property 1: Parser round-trip ──

describe('Property 1: Parser round-trip', () => {
  it('printVrd → parseVrdSafe preserves structural equivalence for nodes with v2 props', () => {
    fc.assert(
      fc.property(astArb, (ast) => {
        const printed = printVrd(ast);
        const result = parseVrdSafe(printed);

        // No error-level diagnostics
        const errors = result.diagnostics.filter(d => d.severity === 'error');
        expect(errors).toHaveLength(0);

        const reparsed = result.ast;

        // Node count preserved
        expect(reparsed.nodes.length).toBe(ast.nodes.length);

        // Each node structurally equivalent
        for (const origNode of ast.nodes) {
          const reparsedNode = reparsed.nodes.find(n => n.id === origNode.id);
          expect(reparsedNode).toBeDefined();
          if (reparsedNode) {
            expect(nodeEquivalent(origNode, reparsedNode)).toBe(true);
          }
        }

        // Edge count preserved
        expect(reparsed.edges.length).toBe(ast.edges.length);

        // Each edge structurally equivalent (matched by from/to)
        for (let i = 0; i < ast.edges.length; i++) {
          const origEdge = ast.edges[i];
          const reparsedEdge = reparsed.edges[i];
          expect(reparsedEdge).toBeDefined();
          if (reparsedEdge) {
            expect(edgeEquivalent(origEdge, reparsedEdge)).toBe(true);
          }
        }

        // Group count preserved
        expect(reparsed.groups.length).toBe(ast.groups.length);

        // Each group structurally equivalent
        for (const origGroup of ast.groups) {
          const reparsedGroup = reparsed.groups.find(g => g.id === origGroup.id);
          expect(reparsedGroup).toBeDefined();
          if (reparsedGroup) {
            expect(groupEquivalent(origGroup, reparsedGroup)).toBe(true);
          }
        }

        // Config preserved
        if (ast.config.layout !== undefined) {
          expect(reparsed.config.layout).toBe(ast.config.layout);
        }
        if (ast.config.theme !== undefined) {
          expect(reparsed.config.theme).toBe(ast.config.theme);
        }
      }),
    );
  });
});

// Feature: integration-wiring-phase, Property 2
// Validates: Requirements 1.3, 2.3, 3.3, 4.5, 10.5, 10.6

/**
 * Property 2: Invalid enum values produce diagnostics
 *
 * For each enum field (shape, status, enter/exit animation, routing),
 * generating a value NOT in the valid set must cause parseVrdSafe to
 * return at least one diagnostic with severity 'warning' or 'error'.
 */
describe('Property 2: Invalid enum values produce diagnostics', () => {
  /** Shared helper: assert ≥1 warning/error diagnostic */
  function assertHasDiagnostic(source: string): void {
    const result = parseVrdSafe(source);
    const warnOrError = result.diagnostics.filter(
      d => d.severity === 'warning' || d.severity === 'error',
    );
    expect(warnOrError.length).toBeGreaterThanOrEqual(1);
  }

  it('invalid shape values produce warning diagnostics', () => {
    const validShapes = new Set([...VALID_SHAPES]);
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => !validShapes.has(s) && /^[a-z][a-z0-9-]*$/.test(s),
        ),
        (invalidShape) => {
          const source = `server mynode:\n  shape: ${invalidShape}`;
          assertHasDiagnostic(source);
        },
      ),
    );
  });

  it('invalid status values produce warning diagnostics', () => {
    const validStatuses = new Set([...VALID_STATUSES]);
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => !validStatuses.has(s) && /^[a-z][a-z0-9-]*$/.test(s),
        ),
        (invalidStatus) => {
          const source = `server mynode:\n  status: ${invalidStatus}`;
          assertHasDiagnostic(source);
        },
      ),
    );
  });

  it('invalid enter animation values produce warning diagnostics', () => {
    const validAnimations = new Set([...VALID_ANIMATION_TYPES]);
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => !validAnimations.has(s) && /^[a-z][a-z0-9-]*$/.test(s),
        ),
        (invalidAnim) => {
          const source = `server mynode:\n  enter: ${invalidAnim}`;
          assertHasDiagnostic(source);
        },
      ),
    );
  });

  it('invalid exit animation values produce warning diagnostics', () => {
    const validAnimations = new Set([...VALID_ANIMATION_TYPES]);
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => !validAnimations.has(s) && /^[a-z][a-z0-9-]*$/.test(s),
        ),
        (invalidAnim) => {
          const source = `server mynode:\n  exit: ${invalidAnim}`;
          assertHasDiagnostic(source);
        },
      ),
    );
  });

  it('invalid routing values produce warning diagnostics', () => {
    const validRoutings = new Set([...VALID_ROUTING_TYPES]);
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => !validRoutings.has(s) && /^[a-z][a-z0-9-]*$/.test(s),
        ),
        (invalidRouting) => {
          const source = `server a:\nserver b:\na -> b:\n  routing: ${invalidRouting}`;
          assertHasDiagnostic(source);
        },
      ),
    );
  });
});

// Feature: integration-wiring-phase, Property 3
// Validates: Requirements 5.1, 5.2

/**
 * Property 3: Port-to-port edge parsing preserves port names
 *
 * For any valid node IDs and port names, constructing a port-to-port edge
 * string and parsing it must yield an edge with matching fromPort/toPort.
 */
describe('Property 3: Port-to-port edge parsing preserves port names', () => {
  /** Simple port name: starts with letter, alphanumeric only, 2-9 chars */
  const portArb = fc
    .tuple(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
      fc.stringMatching(/^[a-z0-9]{1,8}$/),
    )
    .map(([first, rest]) => first + rest);

  it('directed port-to-port edges preserve fromPort and toPort', () => {
    fc.assert(
      fc.property(
        nodeIdArb, nodeIdArb, portArb, portArb,
        (nodeA, nodeB, portA, portB) => {
          fc.pre(nodeA !== nodeB);
          const source = `server ${nodeA}\nserver ${nodeB}\n${nodeA}.${portA} -> ${nodeB}.${portB}`;
          const result = parseVrdSafe(source);
          const errors = result.diagnostics.filter(d => d.severity === 'error');
          expect(errors).toHaveLength(0);
          expect(result.ast.edges).toHaveLength(1);
          expect(result.ast.edges[0].from).toBe(nodeA);
          expect(result.ast.edges[0].to).toBe(nodeB);
          expect(result.ast.edges[0].props.fromPort).toBe(portA);
          expect(result.ast.edges[0].props.toPort).toBe(portB);
        },
      ),
    );
  });

  it('bidirectional port-to-port edges set bidirectional flag and preserve port names', () => {
    fc.assert(
      fc.property(
        nodeIdArb, nodeIdArb, portArb, portArb,
        (nodeA, nodeB, portA, portB) => {
          fc.pre(nodeA !== nodeB);
          const source = `server ${nodeA}\nserver ${nodeB}\n${nodeA}.${portA} <-> ${nodeB}.${portB}`;
          const result = parseVrdSafe(source);
          const errors = result.diagnostics.filter(d => d.severity === 'error');
          expect(errors).toHaveLength(0);
          expect(result.ast.edges).toHaveLength(1);
          expect(result.ast.edges[0].from).toBe(nodeA);
          expect(result.ast.edges[0].to).toBe(nodeB);
          expect(result.ast.edges[0].props.fromPort).toBe(portA);
          expect(result.ast.edges[0].props.toPort).toBe(portB);
          expect(result.ast.edges[0].props.bidirectional).toBe(true);
        },
      ),
    );
  });
});
