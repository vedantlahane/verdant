import type {
  VrdAST,
  VrdNode,
  VrdEdge,
  VrdGroup,
  VrdParseResult,
  VrdDiagnostic,
  ShapeType,
  NodeStatus,
  AnimationType,
  BadgePosition,
  PortSide,
  RoutingType,
  LayoutType,
} from './types';
import {
  VrdParserError,
  KNOWN_NODE_TYPES_SET,
  VALID_SHAPES,
  VALID_STATUSES,
  VALID_ANIMATION_TYPES,
  VALID_BADGE_POSITIONS,
  VALID_PORT_SIDES,
  VALID_ROUTING_TYPES,
  VALID_LAYOUTS,
} from './types';
import {
  EDGE_INLINE_RE,
  EDGE_BLOCK_RE,
  BIDI_EDGE_INLINE_RE,
  BIDI_EDGE_BLOCK_RE,
  PORT_EDGE_BLOCK_RE,
  PORT_EDGE_INLINE_RE,
  PORT_BIDI_EDGE_BLOCK_RE,
  PORT_BIDI_EDGE_INLINE_RE,
  ANIMATION_BLOCK_RE,
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

interface AnimationScope extends ScopeBase {
  type: 'animation';
  timelineName: string;
}

type Scope = RootScope | GroupScope | NodeScope | EdgeScope | AnimationScope;

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
  const ast = {
    config: {} as any,
    nodes: [] as VrdNode[],
    edges: [] as VrdEdge[],
    groups: [] as VrdGroup[],
  };

  const diagnostics: VrdDiagnostic[] = [];

  // ── Normalize input ──
  const normalized = normalizeInput(input);
  const lines = normalized.split('\n');

  // ── Tracking structures ──
  const stack: Scope[] = [{ type: 'root', indent: -1, line: 0 }];
  const groupMap = new Map<string, any>();
  const nodeMap = new Map<string, any>();
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

    // ── 0a. Port-to-port directed edge block ──
    match = trimmed.match(PORT_EDGE_BLOCK_RE);
    if (match) {
      const edge: VrdEdge = {
        from: match[1], to: match[3],
        props: { fromPort: match[2], toPort: match[4] },
        loc: { line: lineNum, col: indent + 1 },
      };
      ast.edges.push(edge);
      stack.push({ type: 'edge', edgeIndex: ast.edges.length - 1, indent, line: lineNum });
      continue;
    }

    // ── 0b. Port-to-port directed edge inline ──
    match = trimmed.match(PORT_EDGE_INLINE_RE);
    if (match) {
      const edge: VrdEdge = {
        from: match[1], to: match[3],
        props: { fromPort: match[2], toPort: match[4] },
        loc: { line: lineNum, col: indent + 1 },
      };
      if (match[5] !== undefined) edge.props.label = match[5];
      ast.edges.push(edge);
      continue;
    }

    // ── 0c. Port-to-port bidirectional edge block ──
    match = trimmed.match(PORT_BIDI_EDGE_BLOCK_RE);
    if (match) {
      const edge: VrdEdge = {
        from: match[1], to: match[3],
        props: { fromPort: match[2], toPort: match[4], bidirectional: true },
        loc: { line: lineNum, col: indent + 1 },
      };
      ast.edges.push(edge);
      stack.push({ type: 'edge', edgeIndex: ast.edges.length - 1, indent, line: lineNum });
      continue;
    }

    // ── 0d. Port-to-port bidirectional edge inline ──
    match = trimmed.match(PORT_BIDI_EDGE_INLINE_RE);
    if (match) {
      const edge: VrdEdge = {
        from: match[1], to: match[3],
        props: { fromPort: match[2], toPort: match[4], bidirectional: true },
        loc: { line: lineNum, col: indent + 1 },
      };
      if (match[5] !== undefined) edge.props.label = match[5];
      ast.edges.push(edge);
      continue;
    }

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

      const group: any = {
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

    // ── 5b. Animation Block ──
    match = trimmed.match(ANIMATION_BLOCK_RE);
    if (match) {
      const name = match[1];
      if (!ast.config.animations) ast.config.animations = [];
      ast.config.animations.push({ name, duration: 0, keyframes: [] });
      stack.push({ type: 'animation', timelineName: name, indent, line: lineNum });
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

      const node: any = {
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

        const node: any = {
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

        case 'animation': {
          handleAnimationKV(key, rawVal, lineNum, ast, (scope as AnimationScope).timelineName, diag);
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

    case 'minimap':
    case 'post-processing':
    case 'snap-to-grid':
      ast.config[key] = rawVal.trim() === 'true';
      break;

    case 'bloom-intensity':
    case 'grid-size':
    case 'layer-spacing':
    case 'node-spacing': {
      const num = Number(rawVal);
      ast.config[key] = (Number.isFinite(num) ? num : rawVal.trim()) as number;
      break;
    }

    case 'direction':
      ast.config[key] = rawVal.trim();
      break;

    default:
      ast.config[key] = val as string;
      break;
  }
}

// ── Animation KV ──

function handleAnimationKV(
  key: string,
  rawVal: string,
  lineNum: number,
  ast: VrdAST,
  timelineName: string,
  diag: DiagFn,
): void {
  void diag; // reserved for future validation warnings
  const timeline = ast.config.animations?.find(t => t.name === timelineName) as any;
  if (!timeline) return;
  switch (key) {
    case 'duration':
      timeline.duration = Number(rawVal);
      break;
    case 'target':
      (timeline as any)._pendingKf = { ...(timeline as any)._pendingKf, target: rawVal.trim() };
      break;
    case 'property':
      (timeline as any)._pendingKf = { ...(timeline as any)._pendingKf, property: rawVal.trim() };
      break;
    case 'from':
      (timeline as any)._pendingKf = { ...(timeline as any)._pendingKf, from: parseValue(rawVal) };
      break;
    case 'to': {
      const pending = (timeline as any)._pendingKf ?? {};
      timeline.keyframes.push({
        target: pending.target ?? '',
        property: pending.property ?? '',
        from: pending.from,
        to: parseValue(rawVal),
      });
      delete (timeline as any)._pendingKf;
      break;
    }
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
  node: any,
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

    case 'color': {
      const colorVal = parseValue(rawVal);
      node.props.color = typeof colorVal === 'string' ? colorVal : rawVal.trim();
      break;
    }

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

    case 'shape': {
      const val = rawVal.trim();
      if (!VALID_SHAPES.has(val)) {
        diag(lineNum, 'warning', `Invalid shape "${val}" on node "${node.id}". Valid shapes: ${[...VALID_SHAPES].join(', ')}`);
      }
      node.props.shape = val as ShapeType;
      break;
    }

    case 'status': {
      const val = rawVal.trim();
      if (!VALID_STATUSES.has(val)) {
        diag(lineNum, 'warning', `Invalid status "${val}" on node "${node.id}". Valid: healthy, warning, error, unknown`);
      }
      node.props.status = val as NodeStatus;
      break;
    }

    case 'enter': {
      const val = rawVal.trim();
      if (!VALID_ANIMATION_TYPES.has(val)) {
        diag(lineNum, 'warning', `Invalid enter animation "${val}". Valid: fade, scale, slide`);
      }
      node.props.enterAnimation = val as AnimationType;
      break;
    }

    case 'exit': {
      const val = rawVal.trim();
      if (!VALID_ANIMATION_TYPES.has(val)) {
        diag(lineNum, 'warning', `Invalid exit animation "${val}". Valid: fade, scale, slide`);
      }
      node.props.exitAnimation = val as AnimationType;
      break;
    }

    case 'animation-duration': {
      const val = Number(rawVal);
      if (!Number.isFinite(val) || val < 0) {
        diag(lineNum, 'warning', `Invalid animation-duration "${rawVal}". Expected non-negative number (ms).`);
      } else {
        node.props.animationDuration = val;
      }
      break;
    }

    default:
      if (key.startsWith('badge ')) {
        const position = key.slice(6).trim() as BadgePosition;
        if (!VALID_BADGE_POSITIONS.has(position)) {
          diag(lineNum, 'warning', `Invalid badge position "${position}". Valid: top-right, top-left, bottom-right, bottom-left`);
        } else {
          if (!node.props.badges) node.props.badges = [];
          const content = parseValue(rawVal);
          node.props.badges.push({ position, content: typeof content === 'string' ? content : rawVal.trim() });
        }
        break;
      }
      if (key.startsWith('port ')) {
        const portName = key.slice(5).trim();
        const side = rawVal.trim() as PortSide;
        if (!VALID_PORT_SIDES.has(side)) {
          diag(lineNum, 'warning', `Invalid port side "${side}". Valid: top, bottom, left, right, front, back`);
        } else {
          if (!node.props.ports) node.props.ports = [];
          node.props.ports.push({ name: portName, side });
        }
        break;
      }
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
  'routing', 'flow', 'flow-speed', 'flow-count', 'flow-color',
]);

function handleEdgeKV(
  key: string,
  rawVal: string,
  lineNum: number,
  edge: any,
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

    case 'color': {
      const colorVal = parseValue(rawVal);
      edge.props.color = typeof colorVal === 'string' ? colorVal : rawVal.trim();
      break;
    }

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

    case 'routing': {
      const val = rawVal.trim();
      if (!VALID_ROUTING_TYPES.has(val)) {
        diag(lineNum, 'warning', `Invalid routing "${val}". Valid: straight, curved, orthogonal`);
      }
      edge.props.routing = val as RoutingType;
      break;
    }

    case 'flow':
      edge.props.flow = rawVal.trim() === 'true';
      break;

    case 'flow-speed': {
      const val = Number(rawVal);
      if (Number.isFinite(val) && val > 0) edge.props.flowSpeed = val;
      else diag(lineNum, 'warning', `Invalid flow-speed "${rawVal}". Expected positive number.`);
      break;
    }

    case 'flow-count': {
      const val = parseInt(rawVal, 10);
      if (Number.isInteger(val) && val > 0) edge.props.flowCount = val;
      else diag(lineNum, 'warning', `Invalid flow-count "${rawVal}". Expected positive integer.`);
      break;
    }

    case 'flow-color': {
      const colorVal = parseValue(rawVal);
      edge.props.flowColor = typeof colorVal === 'string' ? colorVal : rawVal.trim();
      break;
    }

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
  group: any,
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

    case 'collapsed':
      group.props.collapsed = rawVal.trim() === 'true';
      break;

    case 'layout': {
      const val = rawVal.trim();
      if (!VALID_LAYOUTS.has(val)) {
        diag(lineNum, 'warning', `Invalid group layout "${val}". Valid: ${[...VALID_LAYOUTS].join(', ')}`);
      }
      group.props.layout = val as LayoutType;
      break;
    }

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