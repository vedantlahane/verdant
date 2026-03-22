// packages/parser/tests/parser.test.ts

import { describe, it, expect } from 'vitest';
import { parseVrd, parseVrdSafe } from '../parser';

describe('parseVrd', () => {
  it('parses a minimal diagram', () => {
    const input = `
server web
database db
web -> db
    `.trim();

    const ast = parseVrd(input);
    expect(ast.nodes).toHaveLength(2);
    expect(ast.edges).toHaveLength(1);
    expect(ast.nodes[0]).toMatchObject({ id: 'web', type: 'server', props: {} });
    expect(ast.nodes[1]).toMatchObject({ id: 'db', type: 'database', props: {} });
    expect(ast.edges[0]).toMatchObject({ from: 'web', to: 'db', props: {} });
  });

  it('parses config block', () => {
    const input = `
theme: moss
layout: circular
camera: perspective

server web
    `.trim();

    const ast = parseVrd(input);
    expect(ast.config.theme).toBe('moss');
    expect(ast.config.layout).toBe('circular');
    expect(ast.config.camera).toBe('perspective');
  });

  it('parses edge labels', () => {
    const input = `
server web
database db
web -> db: "queries"
    `.trim();

    const ast = parseVrd(input);
    expect(ast.edges[0].props.label).toBe('queries');
  });

  it('parses node properties', () => {
    const input = `
database postgres:
  label: "PostgreSQL 16"
  color: "#42f554"
  size: lg
  glow: true
    `.trim();

    const ast = parseVrd(input);
    expect(ast.nodes[0].props.label).toBe('PostgreSQL 16');
    expect(ast.nodes[0].props.color).toBe('#42f554');
    expect(ast.nodes[0].props.size).toBe('lg');
    expect(ast.nodes[0].props.glow).toBe(true);
  });

  it('parses position property', () => {
    const input = `
server web:
  position: 1,2,3
    `.trim();

    const ast = parseVrd(input);
    expect(ast.nodes[0].props.position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('parses groups with children', () => {
    const input = `
group backend "Backend Services":
  server auth
  server users
  server orders
    `.trim();

    const ast = parseVrd(input);
    expect(ast.groups).toHaveLength(1);
    expect(ast.groups[0].id).toBe('backend');
    expect(ast.groups[0].label).toBe('Backend Services');
    expect(ast.groups[0].children).toEqual([
      'backend.auth',
      'backend.users',
      'backend.orders',
    ]);
    expect(ast.nodes).toHaveLength(3);
    expect(ast.nodes[0].groupId).toBe('backend');
  });

  it('parses nested groups', () => {
    const input = `
group vpc "Production VPC":
  group public "Public Subnet":
    server web-1
    server web-2
  group private "Private Subnet":
    database primary-db
    `.trim();

    const ast = parseVrd(input);
    expect(ast.groups).toHaveLength(1); // top-level: vpc only
    expect(ast.groups[0].groups).toHaveLength(2); // nested: public + private
    expect(ast.groups[0].groups[0].children).toEqual([
      'public.web-1',
      'public.web-2',
    ]);
  });

  it('parses edge property blocks', () => {
    const input = `
server web
database db
web -> db:
  label: "queries"
  style: animated
  color: "#ffffff"
    `.trim();

    const ast = parseVrd(input);
    expect(ast.edges[0].props.label).toBe('queries');
    expect(ast.edges[0].props.style).toBe('animated');
    expect(ast.edges[0].props.color).toBe('#ffffff');
  });

  it('parses dot notation in edges', () => {
    const input = `
group backend "Backend":
  server auth
  server users

gateway api-gw
api-gw -> backend.auth: "authenticates"
    `.trim();

    const ast = parseVrd(input);
    expect(ast.edges[0].from).toBe('api-gw');
    expect(ast.edges[0].to).toBe('backend.auth');
  });

  it('skips comments and blank lines', () => {
    const input = `
# This is a comment
theme: moss

# Another comment
server web

  
database db
    `.trim();

    const ast = parseVrd(input);
    expect(ast.nodes).toHaveLength(2);
    expect(ast.config.theme).toBe('moss');
  });

  it('warns on unknown component types', () => {
    const input = `
foobar widget
    `.trim();

    const result = parseVrdSafe(input);
    expect(result.ast.nodes).toHaveLength(1);
    expect(result.ast.nodes[0].type).toBe('foobar');
    const warnings = result.diagnostics.filter(d => d.severity === 'warning');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toContain('Unknown node type');
  });

  it('warns on edge referencing unknown nodes', () => {
    const input = `
server web
web -> ghost: "???"
    `.trim();

    const result = parseVrdSafe(input);
    const warnings = result.diagnostics.filter(d => d.severity === 'warning');
    expect(warnings.some(w => w.message.includes('ghost'))).toBe(true);
  });

  it('throws on invalid syntax', () => {
    const input = `this is not valid syntax at all!!!`;
    expect(() => parseVrd(input)).toThrow();
  });

  it('handles full context document example', () => {
    const input = `
# My Stack
theme: moss

server web
database db
cache redis

web -> db: "queries"
web -> redis: "reads"
    `.trim();

    const ast = parseVrd(input);
    expect(ast.config.theme).toBe('moss');
    expect(ast.nodes).toHaveLength(3);
    expect(ast.edges).toHaveLength(2);
    expect(ast.edges[0].props.label).toBe('queries');
    expect(ast.edges[1].props.label).toBe('reads');
  });
});

describe('v2 syntax', () => {
  // Node shape
  it('parses node shape property', () => {
    const input = `server web:\n  shape: sphere`;
    const ast = parseVrd(input);
    expect(ast.nodes[0].props.shape).toBe('sphere');
  });

  it('warns on invalid shape value', () => {
    const input = `server web:\n  shape: invalid-shape`;
    const result = parseVrdSafe(input);
    expect(result.diagnostics.some(d => d.severity === 'warning' && d.message.includes('shape'))).toBe(true);
  });

  // Node status
  it('parses node status property', () => {
    const input = `server web:\n  status: healthy`;
    const ast = parseVrd(input);
    expect(ast.nodes[0].props.status).toBe('healthy');
  });

  it('warns on invalid status value', () => {
    const input = `server web:\n  status: broken`;
    const result = parseVrdSafe(input);
    expect(result.diagnostics.some(d => (d.severity === 'warning' || d.severity === 'error') && d.message.includes('status'))).toBe(true);
  });

  // Node badges
  it('parses badge declarations', () => {
    const input = `server web:\n  badge top-right: 3\n  badge top-left: icon:shield`;
    const ast = parseVrd(input);
    expect(ast.nodes[0].props.badges).toHaveLength(2);
    expect(ast.nodes[0].props.badges![0]).toEqual({ position: 'top-right', content: '3' });
    expect(ast.nodes[0].props.badges![1]).toEqual({ position: 'top-left', content: 'icon:shield' });
  });

  // Node ports
  it('parses port declarations', () => {
    const input = `server web:\n  port http-in: top\n  port http-out: bottom`;
    const ast = parseVrd(input);
    expect(ast.nodes[0].props.ports).toHaveLength(2);
    expect(ast.nodes[0].props.ports![0]).toEqual({ name: 'http-in', side: 'top' });
    expect(ast.nodes[0].props.ports![1]).toEqual({ name: 'http-out', side: 'bottom' });
  });

  // Node animations
  it('parses enter and exit animation properties', () => {
    const input = `server web:\n  enter: fade\n  exit: scale\n  animation-duration: 300`;
    const ast = parseVrd(input);
    expect(ast.nodes[0].props.enterAnimation).toBe('fade');
    expect(ast.nodes[0].props.exitAnimation).toBe('scale');
    expect(ast.nodes[0].props.animationDuration).toBe(300);
  });

  // Edge routing
  it('parses edge routing property', () => {
    const input = `server a\nserver b\na -> b:\n  routing: curved`;
    const ast = parseVrd(input);
    expect(ast.edges[0].props.routing).toBe('curved');
  });

  // Edge flow
  it('parses edge flow properties', () => {
    const input = `server a\nserver b\na -> b:\n  flow: true\n  flow-speed: 2.5\n  flow-count: 10\n  flow-color: "#ff0000"`;
    const ast = parseVrd(input);
    expect(ast.edges[0].props.flow).toBe(true);
    expect(ast.edges[0].props.flowSpeed).toBe(2.5);
    expect(ast.edges[0].props.flowCount).toBe(10);
    expect(ast.edges[0].props.flowColor).toBe('#ff0000');
  });

  // Group collapsed and layout
  it('parses group collapsed and layout properties', () => {
    const input = `group backend "Backend":\n  collapsed: true\n  layout: hierarchical\n  server api`;
    const ast = parseVrd(input);
    expect(ast.groups[0].props.collapsed).toBe(true);
    expect(ast.groups[0].props.layout).toBe('hierarchical');
  });

  // New config keys
  it('parses new config keys without warnings', () => {
    const input = `minimap: true\npost-processing: true\nbloom-intensity: 1.5\nsnap-to-grid: true\ngrid-size: 10\ndirection: LR\nlayer-spacing: 4\nnode-spacing: 2\nserver web`;
    const result = parseVrdSafe(input);
    expect(result.ast.config['minimap']).toBe(true);
    expect(result.ast.config['post-processing']).toBe(true);
    expect(result.ast.config['bloom-intensity']).toBe(1.5);
    expect(result.ast.config['snap-to-grid']).toBe(true);
    expect(result.ast.config['grid-size']).toBe(10);
    expect(result.ast.config['direction']).toBe('LR');
    expect(result.ast.config['layer-spacing']).toBe(4);
    expect(result.ast.config['node-spacing']).toBe(2);
    // No unknown-key warnings for these
    const unknownKeyWarnings = result.diagnostics.filter(d => d.message.includes('Unknown config key'));
    expect(unknownKeyWarnings).toHaveLength(0);
  });

  // Port-to-port edge syntax
  it('parses directed port-to-port edge inline', () => {
    const input = `server a\nserver b\na.http-out -> b.http-in`;
    const ast = parseVrd(input);
    expect(ast.edges[0].from).toBe('a');
    expect(ast.edges[0].to).toBe('b');
    expect(ast.edges[0].props.fromPort).toBe('http-out');
    expect(ast.edges[0].props.toPort).toBe('http-in');
  });

  it('parses directed port-to-port edge block', () => {
    const input = `server a\nserver b\na.out -> b.in:\n  routing: straight`;
    const ast = parseVrd(input);
    expect(ast.edges[0].props.fromPort).toBe('out');
    expect(ast.edges[0].props.toPort).toBe('in');
    expect(ast.edges[0].props.routing).toBe('straight');
  });

  it('parses bidirectional port-to-port edge inline', () => {
    const input = `server a\nserver b\na.sync <-> b.sync`;
    const ast = parseVrd(input);
    expect(ast.edges[0].props.fromPort).toBe('sync');
    expect(ast.edges[0].props.toPort).toBe('sync');
    expect(ast.edges[0].props.bidirectional).toBe(true);
  });

  // Animation timeline blocks
  it('parses animation timeline blocks', () => {
    const input = `animation deploy:\n  duration: 1000\n  target: web\n  property: opacity\n  from: 0\n  to: 1\nserver web`;
    const result = parseVrdSafe(input);
    expect(result.ast.config.animations).toHaveLength(1);
    expect(result.ast.config.animations![0].name).toBe('deploy');
    expect(result.ast.config.animations![0].duration).toBe(1000);
    expect(result.ast.config.animations![0].keyframes).toHaveLength(1);
    expect(result.ast.config.animations![0].keyframes[0].target).toBe('web');
    expect(result.ast.config.animations![0].keyframes[0].property).toBe('opacity');
  });
});
