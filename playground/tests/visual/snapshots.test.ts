/**
 * Visual Regression Snapshot Tests
 *
 * Since we cannot run a real browser/Three.js renderer in a unit test
 * environment, these tests capture serialized JSON representations of the
 * parsed VRD AST (node props, group props, config) as "visual snapshots".
 *
 * First run  → creates snapshot files under __snapshots__/
 * Subsequent → compares against those snapshots; any structural change fails.
 *
 * The "pixel difference > 0.1%" requirement is approximated as:
 *   if ANY field in the snapshot changes, the test fails.
 *
 * Requirements: 28.1–28.5
 */

import { describe, it, expect } from 'vitest';
import { parseVrdSafe, printVrd } from '@verdant/parser';
import type { ShapeType, NodeStatus } from '@verdant/parser';

// ── Constants ──────────────────────────────────────────────────────────────

const SHAPE_TYPES: ShapeType[] = [
  'cube', 'cylinder', 'diamond', 'sphere', 'torus',
  'hexagon', 'pentagon', 'octagon', 'ring', 'box',
  'cone', 'capsule', 'icosahedron', 'plane',
];

const NODE_STATUSES: NodeStatus[] = ['healthy', 'warning', 'error', 'unknown'];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal VRD source for a single node with explicit shape. */
function shapeSource(shape: ShapeType): string {
  return [
    `server node1:`,
    `  shape: ${shape}`,
  ].join('\n');
}

/** Build a VRD source for a cube node with a given status. */
function statusSource(status: NodeStatus): string {
  return [
    `server node1:`,
    `  shape: cube`,
    `  status: ${status}`,
  ].join('\n');
}

/** Build a 5-node diagram with a given theme. */
function themeSource(theme: string): string {
  return [
    `theme: ${theme}`,
    ``,
    `server node1`,
    `server node2`,
    `server node3`,
    `server node4`,
    `server node5`,
    `node1 -> node2`,
    `node2 -> node3`,
    `node3 -> node4`,
    `node4 -> node5`,
  ].join('\n');
}

/** Build a diagram with a group in collapsed or expanded state. */
function groupSource(collapsed: boolean): string {
  return [
    `group backend "Backend Services":`,
    `  collapsed: ${collapsed}`,
    `  server auth`,
    `  server users`,
  ].join('\n');
}

/**
 * Structural diff check — approximates "pixel difference > 0.1%".
 * Vitest's toMatchSnapshot() will fail if any field changes.
 */
function snapshotProps(value: unknown): unknown {
  // Strip source-location info (line/col) so snapshots are stable
  return JSON.parse(
    JSON.stringify(value, (key, val) => (key === 'loc' ? undefined : val)),
  );
}

// ── 1. ShapeType snapshots ─────────────────────────────────────────────────
// Validates: Requirements 28.1, 28.2

describe('Visual regression – ShapeType (default size, no status)', () => {
  for (const shape of SHAPE_TYPES) {
    it(`shape: ${shape}`, () => {
      const { ast, diagnostics } = parseVrdSafe(shapeSource(shape));

      // No parse errors
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);

      // Exactly one node
      expect(ast.nodes).toHaveLength(1);

      const nodeProps = snapshotProps(ast.nodes[0].props);
      expect(nodeProps).toMatchSnapshot();
    });
  }
});

// ── 2. NodeStatus snapshots ────────────────────────────────────────────────
// Validates: Requirements 28.1, 28.3

describe('Visual regression – NodeStatus on cube node', () => {
  for (const status of NODE_STATUSES) {
    it(`status: ${status}`, () => {
      const { ast, diagnostics } = parseVrdSafe(statusSource(status));

      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);

      expect(ast.nodes).toHaveLength(1);
      expect(ast.nodes[0].props.shape).toBe('cube');

      const nodeProps = snapshotProps(ast.nodes[0].props);
      expect(nodeProps).toMatchSnapshot();
    });
  }
});

// ── 3. Theme snapshots ─────────────────────────────────────────────────────
// Validates: Requirements 28.1, 28.4

describe('Visual regression – themes on 5-node diagram', () => {
  for (const theme of ['light', 'dark']) {
    it(`theme: ${theme}`, () => {
      const { ast, diagnostics } = parseVrdSafe(themeSource(theme));

      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors).toHaveLength(0);

      expect(ast.nodes).toHaveLength(5);
      expect(ast.edges).toHaveLength(4);

      const config = snapshotProps(ast.config);
      expect(config).toMatchSnapshot();

      // Also snapshot the full node list to catch any structural drift
      const nodes = snapshotProps(ast.nodes.map(n => ({ id: n.id, type: n.type, props: n.props })));
      expect(nodes).toMatchSnapshot();
    });
  }
});

// ── 4. Group snapshots ─────────────────────────────────────────────────────
// Validates: Requirements 28.1, 28.5

describe('Visual regression – collapsed and expanded group', () => {
  it('collapsed group', () => {
    const { ast, diagnostics } = parseVrdSafe(groupSource(true));

    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors).toHaveLength(0);

    expect(ast.groups).toHaveLength(1);
    const group = ast.groups[0];
    expect(group.props.collapsed).toBe(true);

    const groupSnapshot = snapshotProps({
      id: group.id,
      label: group.label,
      children: group.children,
      props: group.props,
    });
    expect(groupSnapshot).toMatchSnapshot();
  });

  it('expanded group', () => {
    const { ast, diagnostics } = parseVrdSafe(groupSource(false));

    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors).toHaveLength(0);

    expect(ast.groups).toHaveLength(1);
    const group = ast.groups[0];
    expect(group.props.collapsed).toBe(false);

    const groupSnapshot = snapshotProps({
      id: group.id,
      label: group.label,
      children: group.children,
      props: group.props,
    });
    expect(groupSnapshot).toMatchSnapshot();
  });
});

// ── 5. Round-trip stability ────────────────────────────────────────────────
// Validates: Requirements 28.2 (snapshot stability across print→parse cycles)

describe('Visual regression – round-trip stability', () => {
  it('printed VRD re-parses to identical snapshot', () => {
    const source = themeSource('dark');
    const { ast: ast1 } = parseVrdSafe(source);
    const printed = printVrd(ast1);
    const { ast: ast2 } = parseVrdSafe(printed);

    const snap1 = snapshotProps({ nodes: ast1.nodes, config: ast1.config });
    const snap2 = snapshotProps({ nodes: ast2.nodes, config: ast2.config });

    expect(snap1).toEqual(snap2);
    expect(snap2).toMatchSnapshot();
  });
});
