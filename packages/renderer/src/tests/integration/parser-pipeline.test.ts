// Feature: integration-wiring-phase, Task 9.1
// Validates: Requirements 26.1

import { describe, it, expect } from 'vitest';
import { parseVrdSafe } from '@verdant/parser';

const VRD_SOURCE = `
layout: hierarchical
direction: LR
minimap: true
post-processing: true
bloom-intensity: 1.5
snap-to-grid: true
grid-size: 10
layer-spacing: 100
node-spacing: 50

server nodeA:
  shape: cube
  status: healthy
  badge top-right: "v2"
  port in: top
  enter: fade
  exit: scale
  animation-duration: 500

server nodeB:
  shape: cube

server nodeC:
  shape: cube

nodeA -> nodeB:
  routing: curved
  flow: true
  flow-speed: 1.5
  flow-count: 5
  flow-color: "#00ff00"

nodeA.in -> nodeC.in

group myGroup "My Group":
  collapsed: true
  server innerNode
`.trim();

describe('Parser pipeline integration (Task 9.1)', () => {
  it('parses comprehensive v2 .vrd source with zero error diagnostics', () => {
    const result = parseVrdSafe(VRD_SOURCE);

    // 1. Zero error diagnostics
    const errors = result.diagnostics.filter(d => d.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('parses config fields correctly', () => {
    const { ast } = parseVrdSafe(VRD_SOURCE);

    expect(ast.config.layout).toBe('hierarchical');
    expect(ast.config.direction).toBe('LR');
    expect(ast.config.minimap).toBe(true);
    expect(ast.config['post-processing']).toBe(true);
    expect(ast.config['bloom-intensity']).toBe(1.5);
    expect(ast.config['snap-to-grid']).toBe(true);
    expect(ast.config['grid-size']).toBe(10);
    expect(ast.config['layer-spacing']).toBe(100);
    expect(ast.config['node-spacing']).toBe(50);
  });

  it('parses node with shape, status, badges, ports, and animations', () => {
    const { ast } = parseVrdSafe(VRD_SOURCE);

    const nodeA = ast.nodes.find(n => n.id === 'nodeA');
    expect(nodeA).toBeDefined();
    expect(nodeA!.props.shape).toBe('cube');
    expect(nodeA!.props.status).toBe('healthy');
    expect(nodeA!.props.badges).toHaveLength(1);
    expect(nodeA!.props.badges![0]).toEqual({ position: 'top-right', content: 'v2' });
    expect(nodeA!.props.ports).toHaveLength(1);
    expect(nodeA!.props.ports![0]).toEqual({ name: 'in', side: 'top' });
    expect(nodeA!.props.enterAnimation).toBe('fade');
    expect(nodeA!.props.exitAnimation).toBe('scale');
    expect(nodeA!.props.animationDuration).toBe(500);
  });

  it('parses edge with routing, flow, flowSpeed, flowCount, flowColor', () => {
    const { ast } = parseVrdSafe(VRD_SOURCE);

    const edge = ast.edges.find(e => e.from === 'nodeA' && e.to === 'nodeB');
    expect(edge).toBeDefined();
    expect(edge!.props.routing).toBe('curved');
    expect(edge!.props.flow).toBe(true);
    expect(edge!.props.flowSpeed).toBe(1.5);
    expect(edge!.props.flowCount).toBe(5);
    expect(edge!.props.flowColor).toBe('#00ff00');
  });

  it('parses port-to-port edge with fromPort and toPort set', () => {
    const { ast } = parseVrdSafe(VRD_SOURCE);

    const portEdge = ast.edges.find(e => e.from === 'nodeA' && e.to === 'nodeC');
    expect(portEdge).toBeDefined();
    expect(portEdge!.props.fromPort).toBe('in');
    expect(portEdge!.props.toPort).toBe('in');
  });

  it('parses group with collapsed: true', () => {
    const { ast } = parseVrdSafe(VRD_SOURCE);

    const group = ast.groups.find(g => g.id === 'myGroup');
    expect(group).toBeDefined();
    expect(group!.props.collapsed).toBe(true);
  });
});
