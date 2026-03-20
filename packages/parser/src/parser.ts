import type {
  VrdAST,
  VrdNode,
  VrdEdge,
  VrdGroup,
  VrdParseResult,
  VrdDiagnostic,
} from './types';
import { VrdParserError, KNOWN_NODE_TYPES_SET } from './types';
import {
  EDGE_INLINE_RE,
  EDGE_BLOCK_RE,
  BIDI_EDGE_INLINE_RE,
  BIDI_EDGE_BLOCK_RE,
  GROUP_START_RE,
  NODE_BLOCK_RE,
  NODE_INLINE_RE,
  KV_RE,
  stripInlineComment,
  measureIndent,
} from './patterns';
import { parseValue, parsePosition, parseWidth } from './values';
import { validateAst } from './validate';

// ============================================
// Scope Stack
// ============================================

interface ScopeBase {
  indent: number;
  line: number;
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
// Public API
// ============================================

/**
 * Parse .vrd source into an AST. Throws on first error.
 * Use `parseVrdSafe` for non-throwing variant with diagnostics.
 */
export function parseVrd(input: string): VrdAST {
  const result = parseVrdSafe(input);

  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new VrdParserError(errors[0].message, errors[0].line);
  }

  return result.ast;
}

/**
 * Parse .vrd source into an AST with diagnostics.
 * Never throws — all issues reported via diagnostics array.
 */
export function parseVrdSafe(input: string): VrdParseResult {
  const ast: VrdAST = {
    config: {},
    nodes: [],
    edges: [],
    groups: [],
  };

  const diagnostics: VrdDiagnostic[] = [];

  // ── Normalize input ──
  const normalized = normalizeInput(input);
  const lines = normalized.split('\n');

  // ── Tracking structures ──
  const stack: Scope[] = [{ type: 'root', indent: -1, line: 0 }];
  const groupMap = new Map<string, VrdGroup>();
  const nodeMap = new Map<string, VrdNode>();
  const declaredNodeIds = new Set<string>();
  let tabWarningEmitted = false;

  // ── Helpers ──

  function currentScope(): Scope {
    return stack[stack.length - 1];
  }

  function findParentGroup(): GroupScope | null {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].type === 'group') return stack[i] as GroupScope;
    }
    return null;
  }

  function diag(
    line: number,
    severity: VrdDiagnostic['severity'],
    message: string,
    col?: number,
  ): void {
    diagnostics.push({ line, severity, message, col });
  }

  function resolveFullId(localId: string, parentGroup: GroupScope | null): string {
    return parentGroup ? `${parentGroup.groupId}.${localId}` : localId;
  }

  function registerNode(
    node: VrdNode,
    lineNum: number,
    parentGroup: GroupScope | null,
  ): void {
    // Duplicate ID check
    if (declaredNodeIds.has(node.id)) {
      diag(
        lineNum,
        'warning',
        `Duplicate node ID "${node.id}". Previous declaration will be overwritten.`,
      );
      // Remove the old one from ast.nodes to avoid duplicates
      const oldIndex = ast.nodes.findIndex((n) => n.id === node.id);
      if (oldIndex !== -1) ast.nodes.splice(oldIndex, 1);
    }

    ast.nodes.push(node);
    nodeMap.set(node.id, node);
    declaredNodeIds.add(node.id);

    // Register in parent group
    if (parentGroup) {
      const group = groupMap.get(parentGroup.groupId);
      if (group && !group.children.includes(node.id)) {
        group.children.push(node.id);
      }
    }
  }

  // ── Main parse loop ──

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const originalLine = lines[i];

    // Strip inline comments
    const commentStripped = stripInlineComment(originalLine);

    // Measure indent
    const { indent, hasTabs } = measureIndent(commentStripped);
    if (hasTabs && !tabWarningEmitted) {
      diag(lineNum, 'info', 'Tab characters detected. Normalizing to 2 spaces per tab.');
      tabWarningEmitted = true;
    }

    // Trim
    const trimmed = commentStripped.trim();

    // Skip blanks, separators
    if (trimmed === '' || trimmed === '---') continue;

    // Pop scope stack on dedent
    while (stack.length > 1 && currentScope().indent >= indent) {
      stack.pop();
    }

    const scope = currentScope();
    let match: RegExpMatchArray | null;

    // ── 1. Bidirectional Edge Block ──
    match = trimmed.match(BIDI_EDGE_BLOCK_RE);
    if (match) {
      const edge: VrdEdge = {
        from: match[1],
        to: match[2],
        props: { bidirectional: true },
        loc: { line: lineNum, col: indent + 1 },
      };
      ast.edges.push(edge);
      stack.push({ type: 'edge', edgeIndex: ast.edges.length - 1, indent, line: lineNum });
      continue;
    }

    // ── 2. Bidirectional Edge Inline ──
    match = trimmed.match(BIDI_EDGE_INLINE_RE);
    if (match) {
      const edge: VrdEdge = {
        from: match[1],
        to: match[2],
        props: { bidirectional: true },
        loc: { line: lineNum, col: indent + 1 },
      };
      if (match[3] !== undefined) edge.props.label = match[3];
      ast.edges.push(edge);
      continue;
    }

    // ── 3. Directed Edge Block ──
    match = trimmed.match(EDGE_BLOCK_RE);
    if (match) {
      const edge: VrdEdge = {
        from: match[1],
        to: match[2],
        props: {},
        loc: { line: lineNum, col: indent + 1 },
      };
      ast.edges.push(edge);
      stack.push({ type: 'edge', edgeIndex: ast.edges.length - 1, indent, line: lineNum });
      continue;
    }

    // ── 4. Directed Edge Inline ──
    match = trimmed.match(EDGE_INLINE_RE);
    if (match) {
      const edge: VrdEdge = {
        from: match[1],
        to: match[2],
        props: {},
        loc: { line: lineNum, col: indent + 1 },
      };
      if (match[3] !== undefined) edge.props.label = match[3];
      ast.edges.push(edge);
      continue;
    }

    // ── 5. Group Start ──
    match = trimmed.match(GROUP_START_RE);
    if (match) {
      const groupId = match[1];
      const label = match[2] || undefined;

      // Duplicate group check
      if (groupMap.has(groupId)) {
        diag(lineNum, 'warning', `Duplicate group ID "${groupId}". Previous group will be merged.`);
      }

      const parentGroupScope = findParentGroup();
      const parentGroupId = parentGroupScope?.groupId;

      const group: VrdGroup = {
        id: groupId,
        label,
        children: [],
        groups: [],
        parentGroupId,
        props: {},
        loc: { line: lineNum, col: indent + 1 },
      };

      groupMap.set(groupId, group);

      if (parentGroupId && groupMap.has(parentGroupId)) {
        groupMap.get(parentGroupId)!.groups.push(group);
      } else {
        ast.groups.push(group);
      }

      stack.push({ type: 'group', groupId, indent, line: lineNum });
      continue;
    }

    // ── 6. Node Block ──
    match = trimmed.match(NODE_BLOCK_RE);
    if (match) {
      const type = match[1];
      const localId = match[2];

      if (!KNOWN_NODE_TYPES_SET.has(type)) {
        diag(
          lineNum,
          'warning',
          `Unknown node type "${type}". It will be rendered with a default shape.`,
        );
      }

      const parentGroup = findParentGroup();
      const fullId = resolveFullId(localId, parentGroup);

      const node: VrdNode = {
        id: fullId,
        type,
        props: {},
        groupId: parentGroup?.groupId,
        loc: { line: lineNum, col: indent + 1 },
      };

      registerNode(node, lineNum, parentGroup);
      stack.push({ type: 'node', nodeId: fullId, indent, line: lineNum });
      continue;
    }

    // ── 7. Node Inline ──
    match = trimmed.match(NODE_INLINE_RE);
    if (match) {
      const type = match[1];
      const localId = match[2];

      // Contextual safety: warn if appears inside a node or edge block
      if (scope.type === 'node' || scope.type === 'edge') {
        diag(
          lineNum,
          'warning',
          `"${trimmed}" looks like a node declaration inside a ${scope.type} block. ` +
          `Did you mean "key: value" syntax?`,
        );
        // Don't continue — fall through to KV check below.
        // This avoids creating accidental nodes from typos like `size large`
        // inside a node block (should be `size: large`).
      } else {
        if (!KNOWN_NODE_TYPES_SET.has(type)) {
          diag(
            lineNum,
            'warning',
            `Unknown node type "${type}". It will be rendered with a default shape.`,
          );
        }

        const parentGroup = findParentGroup();
        const fullId = resolveFullId(localId, parentGroup);

        const node: VrdNode = {
          id: fullId,
          type,
          props: {},
          groupId: parentGroup?.groupId,
          loc: { line: lineNum, col: indent + 1 },
        };

        registerNode(node, lineNum, parentGroup);
        continue;
      }
    }

    // ── 8. Key-Value ──
    match = trimmed.match(KV_RE);
    if (match) {
      const key = match[1];
      const rawVal = match[2].trim();

      switch (scope.type) {
        case 'root':
          handleConfigKV(key, rawVal, lineNum, ast, diag);
          break;

        case 'node': {
          const node = nodeMap.get(scope.nodeId);
          if (node) {
            handleNodeKV(key, rawVal, lineNum, node, diag);
          }
          break;
        }

        case 'edge': {
          const edge = ast.edges[scope.edgeIndex];
          if (edge) {
            handleEdgeKV(key, rawVal, lineNum, edge, diag);
          }
          break;
        }

        case 'group': {
          const group = groupMap.get(scope.groupId);
          if (group) {
            handleGroupKV(key, rawVal, lineNum, group, diag);
          }
          break;
        }
      }
      continue;
    }

    // ── 9. Nothing matched ──
    diag(lineNum, 'error', `Unrecognized syntax: "${trimmed}"`);
  }

  // ── Post-parse validation ──
  const validationDiags = validateAst(ast, declaredNodeIds);
  diagnostics.push(...validationDiags);

  return { ast, diagnostics };
}

// ============================================
// Input normalization
// ============================================

function normalizeInput(input: string): string {
  // Normalize line endings
  let normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove BOM
  if (normalized.charCodeAt(0) === 0xfeff) {
    normalized = normalized.substring(1);
  }

  return normalized;
}

// ============================================
// KV Handlers
// ============================================

type DiagFn = (
  line: number,
  severity: VrdDiagnostic['severity'],
  message: string,
  col?: number,
) => void;

// ── Config KV ──

function handleConfigKV(
  key: string,
  rawVal: string,
  lineNum: number,
  ast: VrdAST,
  diag: DiagFn,
): void {
  const val = parseValue(rawVal);

  switch (key) {
    case 'layout':
      if (typeof val === 'string') {
        ast.config.layout = val as VrdAST['config']['layout'];
      } else {
        diag(lineNum, 'warning', `Layout value should be a string, got ${typeof val}`);
      }
      break;

    case 'camera':
      if (typeof val === 'string') {
        ast.config.camera = val as VrdAST['config']['camera'];
      } else {
        diag(lineNum, 'warning', `Camera value should be a string, got ${typeof val}`);
      }
      break;

    default:
      ast.config[key] = val as string;
      break;
  }
}

// ── Node KV ──

const KNOWN_NODE_PROPS: ReadonlySet<string> = new Set([
  'label', 'color', 'size', 'glow', 'icon', 'position',
  'description', 'status', 'opacity', 'scale',
]);

function handleNodeKV(
  key: string,
  rawVal: string,
  lineNum: number,
  node: VrdNode,
  diag: DiagFn,
): void {
  switch (key) {
    case 'position': {
      const pos = parsePosition(rawVal);
      if (pos) {
        node.props.position = pos;
      } else {
        diag(
          lineNum,
          'error',
          `Invalid position "${rawVal}" on node "${node.id}". Expected: x,y,z (three numbers)`,
        );
      }
      break;
    }

    case 'glow':
      node.props.glow = rawVal.trim() === 'true';
      break;

    case 'size': {
      const val = parseValue(rawVal);
      node.props.size = val as typeof node.props.size;
      break;
    }

    case 'label': {
      const val = parseValue(rawVal);
      node.props.label = typeof val === 'string' ? val : String(val);
      break;
    }

    case 'color':
      node.props.color = rawVal.trim();
      break;

    case 'icon':
      node.props.icon = rawVal.trim();
      break;

    case 'opacity': {
      const val = Number(rawVal);
      if (Number.isFinite(val) && val >= 0 && val <= 1) {
        node.props.opacity = val;
      } else {
        diag(lineNum, 'warning', `Invalid opacity "${rawVal}". Expected 0-1.`);
      }
      break;
    }

    case 'scale': {
      const val = Number(rawVal);
      if (Number.isFinite(val) && val > 0) {
        node.props.scale = val;
      } else {
        diag(lineNum, 'warning', `Invalid scale "${rawVal}". Expected positive number.`);
      }
      break;
    }

    default:
      if (!KNOWN_NODE_PROPS.has(key)) {
        diag(
          lineNum,
          'info',
          `Unknown node property "${key}" on "${node.id}". It will be stored but may not be rendered.`,
        );
      }
      node.props[key] = parseValue(rawVal);
      break;
  }
}

// ── Edge KV ──

const KNOWN_EDGE_PROPS: ReadonlySet<string> = new Set([
  'label', 'style', 'color', 'width', 'bidirectional',
  'fromPort', 'toPort', 'description',
]);

function handleEdgeKV(
  key: string,
  rawVal: string,
  lineNum: number,
  edge: VrdEdge,
  diag: DiagFn,
): void {
  switch (key) {
    case 'label': {
      const val = parseValue(rawVal);
      edge.props.label = typeof val === 'string' ? val : String(val);
      break;
    }

    case 'style':
      edge.props.style = rawVal.trim() as typeof edge.props.style;
      break;

    case 'color':
      edge.props.color = rawVal.trim();
      break;

    case 'width': {
      const w = parseWidth(rawVal);
      if (w !== null) {
        edge.props.width = w;
      } else {
        diag(lineNum, 'warning', `Invalid edge width "${rawVal}". Expected positive number.`);
      }
      break;
    }

    case 'bidirectional':
      edge.props.bidirectional = rawVal.trim() === 'true';
      break;

    case 'fromPort':
      edge.props.fromPort = rawVal.trim();
      break;

    case 'toPort':
      edge.props.toPort = rawVal.trim();
      break;

    default:
      if (!KNOWN_EDGE_PROPS.has(key)) {
        diag(
          lineNum,
          'info',
          `Unknown edge property "${key}". It will be stored but may not be rendered.`,
        );
      }
      (edge.props as Record<string, unknown>)[key] = parseValue(rawVal);
      break;
  }
}

// ── Group KV ──

function handleGroupKV(
  key: string,
  rawVal: string,
  lineNum: number,
  group: VrdGroup,
  diag: DiagFn,
): void {
  switch (key) {
    case 'label':
      group.label = typeof parseValue(rawVal) === 'string'
        ? parseValue(rawVal) as string
        : String(parseValue(rawVal));
      break;

    case 'color':
    case 'style':
    case 'description':
      group.props[key] = parseValue(rawVal);
      break;

    default:
      diag(
        lineNum,
        'info',
        `Unknown group property "${key}" on group "${group.id}".`,
      );
      group.props[key] = parseValue(rawVal);
      break;
  }
}