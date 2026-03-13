import { describe, it, expect } from 'vitest';
import { parseVrd, VrdParserError } from './index';

describe('Vrd Parser', () => {

// 1. Simple: 3 nodes + 2 edges
  it('parses simple nodes and edges', () => {
    const input = `
server web-server
database postgres
cache redis

web-server -> postgres: "queries"
web-server -> redis: "cache reads"
    `;
    const ast = parseVrd(input);
    expect(ast.config).toEqual({});
    expect(ast.nodes).toHaveLength(3);
    expect(ast.nodes).toContainEqual({ id: 'web-server', type: 'server', props: {} });
    expect(ast.nodes).toContainEqual({ id: 'postgres', type: 'database', props: {} });
    expect(ast.nodes).toContainEqual({ id: 'redis', type: 'cache', props: {} });
    
    expect(ast.edges).toHaveLength(2);
    expect(ast.edges).toContainEqual({ from: 'web-server', to: 'postgres', label: 'queries' });
    expect(ast.edges).toContainEqual({ from: 'web-server', to: 'redis', label: 'cache reads' });
    
    expect(ast.groups).toHaveLength(0);
  });

// 2. Nodes with properties (label, color, size)
  it('parses nodes with properties', () => {
    const input = `
database postgres:
  label: "PostgreSQL 16"
  color: "#42f554"
  size: lg
  replicas: 3
  active: true
    `;
    const ast = parseVrd(input);
    expect(ast.nodes).toHaveLength(1);
    expect(ast.nodes[0]).toEqual({
      id: 'postgres',
      type: 'database',
      props: {
        label: 'PostgreSQL 16',
        color: '#42f554',
        size: 'lg',
        replicas: 3,
        active: true
      }
    });
  });

// 3. Groups containing nodes
  it('parses groups containing nodes', () => {
    const input = `
group backend "Backend Services":
  server auth
  server users
  server orders
    `;
    const ast = parseVrd(input);
    expect(ast.groups).toHaveLength(1);
    expect(ast.groups[0]).toEqual({ id: 'backend', label: 'Backend Services' });
    
    expect(ast.nodes).toHaveLength(3);
    expect(ast.nodes).toContainEqual({ id: 'backend.auth', type: 'server', props: {}, group: 'backend' });
    expect(ast.nodes).toContainEqual({ id: 'backend.users', type: 'server', props: {}, group: 'backend' });
    expect(ast.nodes).toContainEqual({ id: 'backend.orders', type: 'server', props: {}, group: 'backend' });
  });

// 4. Group member connections (group.member syntax)
  it('parses group member connections', () => {
    const input = `
web-server -> backend.auth: "authenticates"
    `;
    const ast = parseVrd(input);
    expect(ast.edges).toHaveLength(1);
    expect(ast.edges[0]).toEqual({ from: 'web-server', to: 'backend.auth', label: 'authenticates' });
  });

// 5. Config line (theme, layout)
  it('parses top-level config lines', () => {
    const input = `
theme: moss
layout: auto
    `;
    const ast = parseVrd(input);
    expect(ast.config).toEqual({ theme: 'moss', layout: 'auto' });
  });

// 6. Empty input
  it('handles empty input gracefully', () => {
    const input = '';
    const ast = parseVrd(input);
    expect(ast).toEqual({ config: {}, nodes: [], edges: [], groups: [] });
  });

// 7. Invalid syntax (should return helpful error with line number)
  it('throws helpful error with line number on invalid syntax', () => {
    const input = `
server web-server
invalid syntax here
database postgres
    `;
    expect(() => parseVrd(input)).toThrow(VrdParserError);
    expect(() => parseVrd(input)).toThrow('[Line 3] Invalid syntax: "invalid syntax here"');
  });

// 8. Comments (lines starting with #)
  it('ignores comments and empty lines gracefully', () => {
    const input = `
# This is a comment
server web

# Another comment
database db # Does not support inline comments parsing yet, but should fail if not stripped? Actually wait. Our regex won't match inline comments. The requirement just says "lines starting with #".
    `;
    
    // We update the input to only have lines starting with #
    const validCommentInput = `
# This is a comment
server web

# Another comment
database db
`;
    const ast = parseVrd(validCommentInput);
    expect(ast.nodes).toHaveLength(2);
    expect(ast.nodes[0].id).toBe('web');
  });
});
