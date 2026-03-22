// Feature: integration-wiring-phase, Property 11
// Validates: Requirement 22.7

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { printVrd, parseVrdSafe } from '@verdant/parser';
import type { VrdAST, NodeStatus, BadgePosition, PortSide, RoutingType } from '@verdant/parser';

fc.configureGlobal({ numRuns: 100 });

// ── Base AST ──

const baseAst: VrdAST = {
  config: {},
  nodes: [
    { id: 'n1', type: 'server', props: {} },
    { id: 'n2', type: 'database', props: {} },
  ],
  edges: [{ from: 'n1', to: 'n2', props: {} }],
  groups: [],
};

// ── Pure update helpers (replicating NodeInspector.updateNode / updateEdge) ──

function applyNodeUpdate(
  ast: VrdAST,
  nodeId: string,
  updater: (n: VrdAST['nodes'][number]) => void,
): string {
  const newAst: VrdAST = {
    ...ast,
    nodes: ast.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const copy = { ...n, props: { ...n.props } };
      updater(copy);
      return copy;
    }),
  };
  return printVrd(newAst);
}

function applyEdgeUpdate(
  ast: VrdAST,
  edgeIndex: number,
  updater: (e: VrdAST['edges'][number]) => void,
): string {
  const newAst: VrdAST = {
    ...ast,
    edges: ast.edges.map((e, i) => {
      if (i !== edgeIndex) return e;
      const copy = { ...e, props: { ...e.props } };
      updater(copy);
      return copy;
    }),
  };
  return printVrd(newAst);
}

// ── Arbitraries ──

const nodeStatusArb = fc.constantFrom<NodeStatus>('healthy', 'warning', 'error', 'unknown');

const badgePositionArb = fc.constantFrom<BadgePosition>(
  'top-right',
  'top-left',
  'bottom-right',
  'bottom-left',
);

/** Badge content: no quotes, no newlines, no comment chars, non-empty */
const badgeContentArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(
    (s) =>
      !s.includes('"') &&
      !s.includes('\n') &&
      !s.includes('\r') &&
      !s.includes('#') &&
      s.trim().length > 0,
  )
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const portSideArb = fc.constantFrom<PortSide>('top', 'bottom', 'left', 'right', 'front', 'back');

/** Port name: starts with letter, alphanumeric, 2-9 chars */
const portNameArb = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
    fc.stringMatching(/^[a-z0-9]{1,8}$/),
  )
  .map(([first, rest]) => first + rest);

const routingTypeArb = fc.constantFrom<RoutingType>('straight', 'curved', 'orthogonal');

// ── Property 11a: Node status round-trip ──

describe('Property 11: Inspector source update round-trip', () => {
  it('11a — node status: set status → printVrd → parseVrdSafe → status matches', () => {
    fc.assert(
      fc.property(nodeStatusArb, (status) => {
        const source = applyNodeUpdate(baseAst, 'n1', (n) => {
          n.props.status = status;
        });

        const result = parseVrdSafe(source);
        const errors = result.diagnostics.filter((d) => d.severity === 'error');
        expect(errors).toHaveLength(0);

        const node = result.ast.nodes.find((n) => n.id === 'n1');
        expect(node).toBeDefined();
        expect(node!.props.status).toBe(status);
      }),
    );
  });

  // ── Property 11b: Node badge round-trip ──

  it('11b — node badge: add badge → printVrd → parseVrdSafe → badge present', () => {
    fc.assert(
      fc.property(badgePositionArb, badgeContentArb, (position, content) => {
        const source = applyNodeUpdate(baseAst, 'n1', (n) => {
          n.props.badges = [{ position, content }];
        });

        const result = parseVrdSafe(source);
        const errors = result.diagnostics.filter((d) => d.severity === 'error');
        expect(errors).toHaveLength(0);

        const node = result.ast.nodes.find((n) => n.id === 'n1');
        expect(node).toBeDefined();
        expect(node!.props.badges).toBeDefined();
        expect(node!.props.badges!.length).toBeGreaterThanOrEqual(1);

        const badge = (node!.props.badges as Array<{ position: string; content: string }>).find(
          (b) => b.position === position,
        );
        expect(badge).toBeDefined();
        expect(badge!.content).toBe(content);
      }),
    );
  });

  // ── Property 11c: Node port round-trip ──

  it('11c — node port: add port → printVrd → parseVrdSafe → port present', () => {
    fc.assert(
      fc.property(portNameArb, portSideArb, (name, side) => {
        const source = applyNodeUpdate(baseAst, 'n1', (n) => {
          n.props.ports = [{ name, side }];
        });

        const result = parseVrdSafe(source);
        const errors = result.diagnostics.filter((d) => d.severity === 'error');
        expect(errors).toHaveLength(0);

        const node = result.ast.nodes.find((n) => n.id === 'n1');
        expect(node).toBeDefined();
        expect(node!.props.ports).toBeDefined();

        const port = (node!.props.ports as Array<{ name: string; side: string }>).find(
          (p) => p.name === name,
        );
        expect(port).toBeDefined();
        expect(port!.side).toBe(side);
      }),
    );
  });

  // ── Property 11d: Edge routing round-trip ──

  it('11d — edge routing: set routing → printVrd → parseVrdSafe → routing matches', () => {
    fc.assert(
      fc.property(routingTypeArb, (routing) => {
        const source = applyEdgeUpdate(baseAst, 0, (e) => {
          e.props.routing = routing;
        });

        const result = parseVrdSafe(source);
        const errors = result.diagnostics.filter((d) => d.severity === 'error');
        expect(errors).toHaveLength(0);

        expect(result.ast.edges.length).toBeGreaterThanOrEqual(1);
        const edge = result.ast.edges[0];
        expect(edge.props.routing).toBe(routing);
      }),
    );
  });
});
