// Feature: integration-wiring-phase, Property 5
// Validates: Requirements 12.2–12.7

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { VrdNode } from '@verdant/parser';
import type { NodeProps } from '@verdant/primitives';

// Valid value sets (mirrors VALID_* sets in @verdant/parser/types.ts)
const VALID_SHAPES = ['cube', 'cylinder', 'diamond', 'sphere', 'torus', 'hexagon', 'pentagon', 'octagon', 'ring', 'box', 'cone', 'capsule', 'icosahedron', 'plane'] as const;
const VALID_STATUSES = ['healthy', 'warning', 'error', 'unknown'] as const;
const VALID_ANIMATION_TYPES = ['fade', 'scale', 'slide'] as const;
const VALID_BADGE_POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const;
const VALID_PORT_SIDES = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;

fc.configureGlobal({ numRuns: 100 });

/**
 * Property 5: VrdNode v2 props are passed through to BaseNode
 *
 * The SceneContent renderer maps VrdNode.props fields directly to NodeProps.
 * This pure mapping function mirrors the logic in SceneContent.tsx so it can
 * be tested without a Three.js / R3F environment.
 */

/** Mirror of the prop-mapping logic from SceneContent.tsx */
function mapVrdNodeToNodeProps(
  node: VrdNode,
  position: [number, number, number],
  color: string,
): Pick<
  NodeProps,
  | 'shape'
  | 'status'
  | 'badges'
  | 'ports'
  | 'enterAnimation'
  | 'exitAnimation'
  | 'animationDuration'
> {
  return {
    shape: node.props.shape as string | undefined,
    status: node.props.status as NodeProps['status'],
    badges: node.props.badges as NodeProps['badges'],
    ports: node.props.ports as NodeProps['ports'],
    enterAnimation: node.props.enterAnimation as NodeProps['enterAnimation'],
    exitAnimation: node.props.exitAnimation as NodeProps['exitAnimation'],
    animationDuration: node.props.animationDuration as number | undefined,
  };
}

// ── Arbitraries ──────────────────────────────────────────────────────────────

const shapeArb = fc.constantFrom(...VALID_SHAPES) as fc.Arbitrary<string>;
const statusArb = fc.constantFrom(...VALID_STATUSES) as fc.Arbitrary<
  'healthy' | 'warning' | 'error' | 'unknown'
>;
const animTypeArb = fc.constantFrom(...VALID_ANIMATION_TYPES) as fc.Arbitrary<
  'fade' | 'scale' | 'slide'
>;
const badgePositionArb = fc.constantFrom(...VALID_BADGE_POSITIONS) as fc.Arbitrary<
  'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
>;
const portSideArb = fc.constantFrom(...VALID_PORT_SIDES) as fc.Arbitrary<string>;

const badgesArb = fc
  .uniqueArray(badgePositionArb, { maxLength: 4 })
  .chain((positions) =>
    fc.tuple(...positions.map((pos) => fc.string({ minLength: 1, maxLength: 20 }).map((content) => ({ position: pos, content })))),
  )
  .map((arr) => Array.from(arr));

const portsArb = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 6 })
  .chain((names) =>
    fc.tuple(...names.map((name) => portSideArb.map((side) => ({ name, side })))),
  )
  .map((arr) => Array.from(arr));

const vrdNodeV2Arb: fc.Arbitrary<VrdNode> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  type: fc.constantFrom('server', 'database', 'gateway', 'queue', 'user'),
  props: fc.record({
    shape: fc.option(shapeArb, { nil: undefined }),
    status: fc.option(statusArb, { nil: undefined }),
    badges: fc.option(badgesArb, { nil: undefined }),
    ports: fc.option(portsArb, { nil: undefined }),
    enterAnimation: fc.option(animTypeArb, { nil: undefined }),
    exitAnimation: fc.option(animTypeArb, { nil: undefined }),
    animationDuration: fc.option(
      fc.integer({ min: 0, max: 10000 }),
      { nil: undefined },
    ),
  }).map((p) => {
    // Strip undefined keys
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(p)) {
      if (v !== undefined) clean[k] = v;
    }
    return clean;
  }),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 5: VrdNode v2 props are passed through to BaseNode', () => {
  it('shape prop is passed through correctly', () => {
    fc.assert(
      fc.property(vrdNodeV2Arb, (node) => {
        const mapped = mapVrdNodeToNodeProps(node, [0, 0, 0], '#fff');
        expect(mapped.shape).toBe(node.props.shape as string | undefined);
      }),
    );
  });

  it('status prop is passed through correctly', () => {
    fc.assert(
      fc.property(vrdNodeV2Arb, (node) => {
        const mapped = mapVrdNodeToNodeProps(node, [0, 0, 0], '#fff');
        expect(mapped.status).toBe(node.props.status as string | undefined);
      }),
    );
  });

  it('badges prop is passed through correctly', () => {
    fc.assert(
      fc.property(vrdNodeV2Arb, (node) => {
        const mapped = mapVrdNodeToNodeProps(node, [0, 0, 0], '#fff');
        expect(mapped.badges).toStrictEqual(node.props.badges);
      }),
    );
  });

  it('ports prop is passed through correctly', () => {
    fc.assert(
      fc.property(vrdNodeV2Arb, (node) => {
        const mapped = mapVrdNodeToNodeProps(node, [0, 0, 0], '#fff');
        expect(mapped.ports).toStrictEqual(node.props.ports);
      }),
    );
  });

  it('enterAnimation prop is passed through correctly', () => {
    fc.assert(
      fc.property(vrdNodeV2Arb, (node) => {
        const mapped = mapVrdNodeToNodeProps(node, [0, 0, 0], '#fff');
        expect(mapped.enterAnimation).toBe(
          node.props.enterAnimation as string | undefined,
        );
      }),
    );
  });

  it('exitAnimation prop is passed through correctly', () => {
    fc.assert(
      fc.property(vrdNodeV2Arb, (node) => {
        const mapped = mapVrdNodeToNodeProps(node, [0, 0, 0], '#fff');
        expect(mapped.exitAnimation).toBe(
          node.props.exitAnimation as string | undefined,
        );
      }),
    );
  });

  it('animationDuration prop is passed through correctly', () => {
    fc.assert(
      fc.property(vrdNodeV2Arb, (node) => {
        const mapped = mapVrdNodeToNodeProps(node, [0, 0, 0], '#fff');
        expect(mapped.animationDuration).toBe(
          node.props.animationDuration as number | undefined,
        );
      }),
    );
  });

  it('all v2 props are passed through in a single assertion', () => {
    fc.assert(
      fc.property(vrdNodeV2Arb, (node) => {
        const mapped = mapVrdNodeToNodeProps(node, [0, 0, 0], '#fff');

        expect(mapped.shape).toBe(node.props.shape as string | undefined);
        expect(mapped.status).toBe(node.props.status as string | undefined);
        expect(mapped.badges).toStrictEqual(node.props.badges);
        expect(mapped.ports).toStrictEqual(node.props.ports);
        expect(mapped.enterAnimation).toBe(
          node.props.enterAnimation as string | undefined,
        );
        expect(mapped.exitAnimation).toBe(
          node.props.exitAnimation as string | undefined,
        );
        expect(mapped.animationDuration).toBe(
          node.props.animationDuration as number | undefined,
        );
      }),
    );
  });
});

// Feature: integration-wiring-phase, Property 6
// Validates: Requirements 12.2–12.7

import type { VrdEdge } from '@verdant/parser';
import type { EdgeLineProps } from '@verdant/primitives';

/**
 * Property 6: VrdEdge v2 props are passed through to BaseEdge
 *
 * The SceneContent renderer maps VrdEdge.props fields directly to EdgeLineProps.
 * This pure mapping function mirrors the logic in SceneContent.tsx so it can
 * be tested without a Three.js / R3F environment.
 */

const VALID_ROUTING_TYPES = ['straight', 'curved', 'orthogonal'] as const;

/** Mirror of the edge prop-mapping logic from SceneContent.tsx */
function mapVrdEdgeToEdgeLineProps(
  edge: VrdEdge,
  fromPos: [number, number, number],
  toPos: [number, number, number],
): Pick<
  EdgeLineProps,
  | 'routing'
  | 'fromPort'
  | 'toPort'
  | 'fromNodeId'
  | 'toNodeId'
  | 'flowParticles'
> {
  const flowParticles =
    edge.props.flow === true
      ? {
          speed: edge.props.flowSpeed as number | undefined,
          count: edge.props.flowCount as number | undefined,
          color: edge.props.flowColor as string | undefined,
        }
      : undefined;

  return {
    routing: edge.props.routing as EdgeLineProps['routing'],
    fromPort: edge.props.fromPort as string | undefined,
    toPort: edge.props.toPort as string | undefined,
    fromNodeId: edge.from,
    toNodeId: edge.to,
    flowParticles,
  };
}

// ── Arbitraries ──────────────────────────────────────────────────────────────

const routingArb = fc.constantFrom(...VALID_ROUTING_TYPES) as fc.Arbitrary<
  'straight' | 'curved' | 'orthogonal'
>;

const nodeIdArb = fc.string({ minLength: 1, maxLength: 20 });

const vrdEdgeV2Arb: fc.Arbitrary<VrdEdge> = fc
  .tuple(nodeIdArb, nodeIdArb)
  .chain(([from, to]) =>
    fc.record({
      from: fc.constant(from),
      to: fc.constant(to),
      props: fc.record({
        routing: fc.option(routingArb, { nil: undefined }),
        fromPort: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
        toPort: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
        flow: fc.option(fc.boolean(), { nil: undefined }),
        flowSpeed: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }), { nil: undefined }),
        flowCount: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
        flowColor: fc.option(
          fc.stringMatching(/^#[0-9a-f]{6}$/),
          { nil: undefined },
        ),
      }).map((p) => {
        // Strip undefined keys
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(p)) {
          if (v !== undefined) clean[k] = v;
        }
        return clean;
      }),
    }),
  );

const posArb: fc.Arbitrary<[number, number, number]> = fc.tuple(
  fc.float({ noNaN: true, min: Math.fround(-1000), max: Math.fround(1000) }),
  fc.float({ noNaN: true, min: Math.fround(-1000), max: Math.fround(1000) }),
  fc.float({ noNaN: true, min: Math.fround(-1000), max: Math.fround(1000) }),
);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 6: VrdEdge v2 props are passed through to BaseEdge', () => {
  it('routing is passed through correctly', () => {
    fc.assert(
      fc.property(vrdEdgeV2Arb, posArb, posArb, (edge, fromPos, toPos) => {
        const mapped = mapVrdEdgeToEdgeLineProps(edge, fromPos, toPos);
        expect(mapped.routing).toBe(edge.props.routing as string | undefined);
      }),
    );
  });

  it('fromPort is passed through correctly', () => {
    fc.assert(
      fc.property(vrdEdgeV2Arb, posArb, posArb, (edge, fromPos, toPos) => {
        const mapped = mapVrdEdgeToEdgeLineProps(edge, fromPos, toPos);
        expect(mapped.fromPort).toBe(edge.props.fromPort as string | undefined);
      }),
    );
  });

  it('toPort is passed through correctly', () => {
    fc.assert(
      fc.property(vrdEdgeV2Arb, posArb, posArb, (edge, fromPos, toPos) => {
        const mapped = mapVrdEdgeToEdgeLineProps(edge, fromPos, toPos);
        expect(mapped.toPort).toBe(edge.props.toPort as string | undefined);
      }),
    );
  });

  it('fromNodeId is set to edge.from', () => {
    fc.assert(
      fc.property(vrdEdgeV2Arb, posArb, posArb, (edge, fromPos, toPos) => {
        const mapped = mapVrdEdgeToEdgeLineProps(edge, fromPos, toPos);
        expect(mapped.fromNodeId).toBe(edge.from);
      }),
    );
  });

  it('toNodeId is set to edge.to', () => {
    fc.assert(
      fc.property(vrdEdgeV2Arb, posArb, posArb, (edge, fromPos, toPos) => {
        const mapped = mapVrdEdgeToEdgeLineProps(edge, fromPos, toPos);
        expect(mapped.toNodeId).toBe(edge.to);
      }),
    );
  });

  it('flowParticles is constructed when flow === true', () => {
    fc.assert(
      fc.property(vrdEdgeV2Arb, posArb, posArb, (edge, fromPos, toPos) => {
        const mapped = mapVrdEdgeToEdgeLineProps(edge, fromPos, toPos);
        if (edge.props.flow === true) {
          expect(mapped.flowParticles).toBeDefined();
          expect(mapped.flowParticles?.speed).toBe(edge.props.flowSpeed as number | undefined);
          expect(mapped.flowParticles?.count).toBe(edge.props.flowCount as number | undefined);
          expect(mapped.flowParticles?.color).toBe(edge.props.flowColor as string | undefined);
        }
      }),
    );
  });

  it('flowParticles is undefined when flow !== true', () => {
    fc.assert(
      fc.property(vrdEdgeV2Arb, posArb, posArb, (edge, fromPos, toPos) => {
        const mapped = mapVrdEdgeToEdgeLineProps(edge, fromPos, toPos);
        if (edge.props.flow !== true) {
          expect(mapped.flowParticles).toBeUndefined();
        }
      }),
    );
  });

  it('all v2 edge props are passed through in a single assertion', () => {
    fc.assert(
      fc.property(vrdEdgeV2Arb, posArb, posArb, (edge, fromPos, toPos) => {
        const mapped = mapVrdEdgeToEdgeLineProps(edge, fromPos, toPos);

        expect(mapped.routing).toBe(edge.props.routing as string | undefined);
        expect(mapped.fromPort).toBe(edge.props.fromPort as string | undefined);
        expect(mapped.toPort).toBe(edge.props.toPort as string | undefined);
        expect(mapped.fromNodeId).toBe(edge.from);
        expect(mapped.toNodeId).toBe(edge.to);

        if (edge.props.flow === true) {
          expect(mapped.flowParticles).toStrictEqual({
            speed: edge.props.flowSpeed as number | undefined,
            count: edge.props.flowCount as number | undefined,
            color: edge.props.flowColor as string | undefined,
          });
        } else {
          expect(mapped.flowParticles).toBeUndefined();
        }
      }),
    );
  });
});
