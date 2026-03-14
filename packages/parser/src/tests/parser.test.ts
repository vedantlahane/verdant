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
    expect(ast.nodes[0]).toEqual({ id: 'web', type: 'server', props: {} });
    expect(ast.nodes[1]).toEqual({ id: 'db', type: 'database', props: {} });
    expect(ast.edges[0]).toEqual({ from: 'web', to: 'db', props: {} });
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
    expect(warnings[0].message).toContain('Unknown component type');
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