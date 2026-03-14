import type {
  VrdAST,
  VrdNode,
  VrdEdge,
  VrdEdgeProps,
  VrdGroup,
  VrdConfig,
  VrdNodeProps,
  VrdParseResult,
  VrdDiagnostic,
} from './types';
import { VrdParserError, KNOWN_NODE_TYPES } from './types';

// ============================================
// Regex Patterns
// ============================================

// edge:         `web-server -> postgres: "queries"`
// edge block:   `web-server -> postgres:`  (colon at end = block follows)
const EDGE_INLINE_RE = /^([\w.-]+)\s*->\s*([\w.-]+)(?:\s*:\s*"([^"]*)")?$/;
const EDGE_BLOCK_RE  = /^([\w.-]+)\s*->\s*([\w.-]+)\s*:$/;

// group:        `group backend "Backend Services":`
const GROUP_START_RE = /^group\s+([\w-]+)(?:\s+"([^"]*)")?\s*:$/;

// node + block: `server web-server:`
const NODE_BLOCK_RE = /^([\w-]+)\s+([\w-]+)\s*:$/;

// node inline:  `server web-server`
const NODE_INLINE_RE = /^([\w-]+)\s+([\w-]+)$/;

// key: value
const KV_RE = /^([\w-]+)\s*:\s*(.+)$/;

// ============================================
// Value Parser
// ============================================

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();

  // Quoted string
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Booleans
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Numbers
  if (trimmed !== '' && !isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  // Plain string
  return trimmed;
}

/**
 * Parse a `position: x,y,z` value into an object.
 * Supports: `1,2,3` or `1, 2, 3`
 */
function parsePosition(raw: string): { x: number; y: number; z: number } | null {
  const parts = raw.split(',').map(s => s.trim());
  if (parts.length !== 3) return null;
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;
  return { x: nums[0], y: nums[1], z: nums[2] };
}

// ============================================
// Scope Stack Types
// ============================================

interface ScopeBase {
  indent: number;
}

interface RootScope extends ScopeBase {
  type: 'root';
}

interface GroupScope extends ScopeBase {
  type: 'group';
  groupId: string;
}

interface NodeScope extends ScopeBase {
  type: 'node';
  nodeId: string;
}

interface EdgeScope extends ScopeBase {
  type: 'edge';
  edgeIndex: number;
}

type Scope = RootScope | GroupScope | NodeScope | EdgeScope;

// ============================================
// Known Types Set (for validation warnings)
// ============================================

const KNOWN_TYPES_SET = new Set<string>(KNOWN_NODE_TYPES);

// ============================================
// Main Parser
// ============================================

export function parseVrd(input: string): VrdAST {
  const result = parseVrdSafe(input);

  // Throw on errors (backward compatible)
  const errors = result.diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    throw new VrdParserError(errors[0].message, errors[0].line);
  }

  return result.ast;
}

export function parseVrdSafe(input: string): VrdParseResult {
  const ast: VrdAST = {
    config: {},
    nodes: [],
    edges: [],
    groups: [],
  };

  const diagnostics: VrdDiagnostic[] = [];
  const lines = input.split('\n');

  // Scope stack — tracks nesting context
  const stack: Scope[] = [{ type: 'root', indent: -1 }];

  // Group lookup for nesting and children tracking
  const groupMap = new Map<string, VrdGroup>();

  // Track all declared node IDs for edge validation
  const declaredNodeIds = new Set<string>();

  function currentScope(): Scope {
    return stack[stack.length - 1];
  }

  function findParentGroup(): GroupScope | null {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].type === 'group') return stack[i] as GroupScope;
    }
    return null;
  }

  function addDiag(line: number, severity: VrdDiagnostic['severity'], message: string) {
    diagnostics.push({ line, severity, message });
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const originalLine = lines[i];

    // Skip blanks, separators, comments
    const trimmed = originalLine.trim();
    if (trimmed === '' || trimmed === '---' || trimmed.startsWith('#')) {
      continue;
    }

    // Calculate indentation
    const leadingSpaces = originalLine.match(/^(\s*)/);
    const indent = leadingSpaces ? leadingSpaces[1].length : 0;

    // Pop scope stack when we dedent
    while (stack.length > 1 && currentScope().indent >= indent) {
      stack.pop();
    }

    const scope = currentScope();
    let match: RegExpMatchArray | null;

    // ── 1. Edge Block (with properties following) ──
    match = trimmed.match(EDGE_BLOCK_RE);
    if (match) {
      const from = match[1];
      const to = match[2];
      const edge: VrdEdge = { from, to, props: {} };
      ast.edges.push(edge);
      stack.push({ type: 'edge', edgeIndex: ast.edges.length - 1, indent });
      continue;
    }

    // ── 2. Edge Inline ──
    match = trimmed.match(EDGE_INLINE_RE);
    if (match) {
      const from = match[1];
      const to = match[2];
      const label = match[3]; // may be undefined
      const edge: VrdEdge = { from, to, props: {} };
      if (label !== undefined) {
        edge.props.label = label;
      }
      ast.edges.push(edge);
      continue;
    }

    // ── 3. Group Start ──
    match = trimmed.match(GROUP_START_RE);
    if (match) {
      const groupId = match[1];
      const label = match[2] || undefined;

      // Determine parent group for nesting
      const parentGroupScope = findParentGroup();
      const parentGroupId = parentGroupScope?.groupId;

      const group: VrdGroup = {
        id: groupId,
        label,
        children: [],
        groups: [],
        parentGroupId,
      };

      // Register in map
      groupMap.set(groupId, group);

      // If nested, add to parent's sub-groups
      if (parentGroupId && groupMap.has(parentGroupId)) {
        groupMap.get(parentGroupId)!.groups.push(group);
      } else {
        // Top-level group
        ast.groups.push(group);
      }

      stack.push({ type: 'group', groupId, indent });
      continue;
    }

    // ── 4. Node Block (with properties following) ──
    match = trimmed.match(NODE_BLOCK_RE);
    if (match) {
      const type = match[1];
      const localId = match[2];

      // Warn if unknown type
      if (!KNOWN_TYPES_SET.has(type)) {
        addDiag(lineNum, 'warning', `Unknown component type "${type}". Known types: ${[...KNOWN_TYPES_SET].join(', ')}`);
      }

      const parentGroup = findParentGroup();
      const groupId = parentGroup?.groupId;
      const fullId = groupId ? `${groupId}.${localId}` : localId;

      const node: VrdNode = { id: fullId, type, props: {} };
      if (groupId) {
        node.groupId = groupId;
        // Track in group's children
        if (groupMap.has(groupId)) {
          groupMap.get(groupId)!.children.push(fullId);
        }
      }

      ast.nodes.push(node);
      declaredNodeIds.add(fullId);
      stack.push({ type: 'node', nodeId: fullId, indent });
      continue;
    }

    // ── 5. Node Inline (no properties) ──
    match = trimmed.match(NODE_INLINE_RE);
    if (match) {
      const type = match[1];
      const localId = match[2];

      // Avoid matching config keys that look like "word word"
      // Config keys always have `:` — but NODE_INLINE_RE already
      // excludes lines with `:` since \w doesn't include `:`.

      // However, we should skip if inside an edge/node scope
      // and the "type" looks like a property name.
      // This is handled by scope — if we're inside a node or edge
      // scope, a bare two-word line is unusual. We'll let it create
      // a node but warn.
      if (scope.type === 'node' || scope.type === 'edge') {
        addDiag(lineNum, 'warning', `Two-word line "${trimmed}" found inside ${scope.type} block. Did you mean to use "key: value" syntax?`);
      }

      if (!KNOWN_TYPES_SET.has(type)) {
        addDiag(lineNum, 'warning', `Unknown component type "${type}". Known types: ${[...KNOWN_TYPES_SET].join(', ')}`);
      }

      const parentGroup = findParentGroup();
      const groupId = parentGroup?.groupId;
      const fullId = groupId ? `${groupId}.${localId}` : localId;

      const node: VrdNode = { id: fullId, type, props: {} };
      if (groupId) {
        node.groupId = groupId;
        if (groupMap.has(groupId)) {
          groupMap.get(groupId)!.children.push(fullId);
        }
      }

      ast.nodes.push(node);
      declaredNodeIds.add(fullId);
      continue;
    }

    // ── 6. Key-Value (config, node props, edge props) ──
    match = trimmed.match(KV_RE);
    if (match) {
      const key = match[1];
      const rawVal = match[2].trim();

      if (scope.type === 'root') {
        // Top-level config
        ast.config[key] = parseValue(rawVal) as string;
      } else if (scope.type === 'node') {
        // Node property
        const node = findNodeById(ast, scope.nodeId);
        if (node) {
          if (key === 'position') {
            const pos = parsePosition(rawVal);
            if (pos) {
              node.props.position = pos;
            } else {
              addDiag(lineNum, 'error', `Invalid position format "${rawVal}". Expected: x,y,z (three numbers)`);
            }
          } else if (key === 'glow') {
            node.props.glow = rawVal === 'true';
          } else {
            node.props[key] = parseValue(rawVal);
          }
        }
      } else if (scope.type === 'edge') {
        // Edge property
        const edge = ast.edges[scope.edgeIndex];
        if (edge) {
          if (key === 'width') {
            edge.props.width = Number(parseValue(rawVal));
          } else {
            (edge.props as Record<string, unknown>)[key] = parseValue(rawVal);
          }
        }
      } else if (scope.type === 'group') {
        // Config-like keys inside group scope — could be group metadata
        // For now, warn
        addDiag(lineNum, 'warning', `Key-value "${key}: ${rawVal}" inside group scope is not standard. Did you mean to declare a node?`);
      }
      continue;
    }

    // ── 7. Nothing matched → syntax error ──
    addDiag(lineNum, 'error', `Invalid syntax: "${trimmed}"`);
  }

  // ── Post-parse validation ──

  // Validate edge references
  for (const edge of ast.edges) {
    if (!declaredNodeIds.has(edge.from)) {
      addDiag(0, 'warning', `Edge references unknown node "${edge.from}"`);
    }
    if (!declaredNodeIds.has(edge.to)) {
      addDiag(0, 'warning', `Edge references unknown node "${edge.to}"`);
    }
  }

  return { ast, diagnostics };
}

// ============================================
// Helpers
// ============================================

function findNodeById(ast: VrdAST, id: string): VrdNode | undefined {
  // Search backwards (most recently added is most likely)
  for (let j = ast.nodes.length - 1; j >= 0; j--) {
    if (ast.nodes[j].id === id) return ast.nodes[j];
  }
  return undefined;
}