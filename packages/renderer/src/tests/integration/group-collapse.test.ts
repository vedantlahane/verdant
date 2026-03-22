// Feature: integration-wiring-phase, Task 9.5
// Validates: Requirements 26.6
import { describe, it, beforeEach, expect } from 'vitest';
import { useRendererStore } from '../../store';
import type { VrdAST } from '@verdant/parser';

const collapsedGroupAST: VrdAST = {
  config: {},
  nodes: [
    { id: 'top-node', type: 'server', props: {} },
    { id: 'child-1', type: 'service', props: {}, groupId: 'myGroup' },
    { id: 'child-2', type: 'service', props: {}, groupId: 'myGroup' },
  ],
  edges: [],
  groups: [{
    id: 'myGroup',
    label: 'My Group',
    children: ['child-1', 'child-2'],
    groups: [],
    props: { collapsed: true },
  }],
};

const expandedGroupAST: VrdAST = {
  ...collapsedGroupAST,
  groups: [{
    ...collapsedGroupAST.groups[0],
    props: { collapsed: false },
  }],
};

describe('Group collapse integration (Task 9.5)', () => {
  beforeEach(() => {
    useRendererStore.setState({ ast: null, nodeIndex: new Map(), positions: {} });
  });

  it('collapsed group has collapsed: true in props', () => {
    const { setAst } = useRendererStore.getState();
    setAst(collapsedGroupAST);

    const { ast } = useRendererStore.getState();
    expect(ast).not.toBeNull();
    const group = ast!.groups.find((g) => g.id === 'myGroup');
    expect(group).toBeDefined();
    expect(group!.props.collapsed).toBe(true);
  });

  it('child nodes are still present in ast.nodes when group is collapsed', () => {
    const { setAst } = useRendererStore.getState();
    setAst(collapsedGroupAST);

    const { ast } = useRendererStore.getState();
    const nodeIds = ast!.nodes.map((n) => n.id);
    expect(nodeIds).toContain('child-1');
    expect(nodeIds).toContain('child-2');
  });

  it('group children array contains child node IDs when collapsed', () => {
    const { setAst } = useRendererStore.getState();
    setAst(collapsedGroupAST);

    const { ast } = useRendererStore.getState();
    const group = ast!.groups.find((g) => g.id === 'myGroup');
    expect(group!.children).toContain('child-1');
    expect(group!.children).toContain('child-2');
  });

  it('top-level node outside group is accessible when group is collapsed', () => {
    const { setAst } = useRendererStore.getState();
    setAst(collapsedGroupAST);

    const { ast } = useRendererStore.getState();
    const nodeIds = ast!.nodes.map((n) => n.id);
    expect(nodeIds).toContain('top-node');
  });

  it('expanding group sets collapsed: false in props', () => {
    const { setAst } = useRendererStore.getState();

    // Start collapsed
    setAst(collapsedGroupAST);
    const collapsedState = useRendererStore.getState();
    expect(collapsedState.ast!.groups[0].props.collapsed).toBe(true);

    // Expand
    setAst(expandedGroupAST);
    const expandedState = useRendererStore.getState();
    const group = expandedState.ast!.groups.find((g) => g.id === 'myGroup');
    expect(group).toBeDefined();
    expect(group!.props.collapsed).toBe(false);
  });

  it('child nodes remain accessible after expanding group', () => {
    const { setAst } = useRendererStore.getState();

    setAst(collapsedGroupAST);
    setAst(expandedGroupAST);

    const { ast } = useRendererStore.getState();
    const nodeIds = ast!.nodes.map((n) => n.id);
    expect(nodeIds).toContain('child-1');
    expect(nodeIds).toContain('child-2');
  });

  it('nodeIndex contains child nodes regardless of collapsed state', () => {
    const { setAst } = useRendererStore.getState();

    setAst(collapsedGroupAST);
    const collapsedIndex = useRendererStore.getState().nodeIndex;
    expect(collapsedIndex.has('child-1')).toBe(true);
    expect(collapsedIndex.has('child-2')).toBe(true);

    setAst(expandedGroupAST);
    const expandedIndex = useRendererStore.getState().nodeIndex;
    expect(expandedIndex.has('child-1')).toBe(true);
    expect(expandedIndex.has('child-2')).toBe(true);
  });
});
