// parser/parser.ts — Main parse orchestrator

import type {
  VrdAST, VrdEdge, VrdEdgeProps, VrdParseResult,
} from './types';
import { VrdParserError } from './errors';
import { DiagnosticCollector } from './errors';
import { ASTBuilder } from './builder';
import { ScopeStack } from './scope';
import { KNOWN_NODE_TYPES_SET } from './constants';
import {
  EDGE_INLINE_RE, EDGE_BLOCK_RE,
  BIDI_EDGE_INLINE_RE, BIDI_EDGE_BLOCK_RE,
  PORT_EDGE_BLOCK_RE, PORT_EDGE_INLINE_RE,
  PORT_BIDI_EDGE_BLOCK_RE, PORT_BIDI_EDGE_INLINE_RE,
  ANIMATION_BLOCK_RE, GROUP_START_RE,
  NODE_BLOCK_RE, NODE_INLINE_RE, KV_RE,
  stripInlineComment, measureIndent,
} from './patterns';
import {
  handleConfigKV, handleNodeKV, handleEdgeKV,
  handleGroupKV, handleAnimationKV,
} from './handlers';
import { validateAst } from './validate';

/**
 * Parse .vrd source into an AST. Throws on first error.
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
 * Parse .vrd source into an AST with diagnostics. Never throws.
 */
export function parseVrdSafe(input: string): VrdParseResult {
  const diag = new DiagnosticCollector();
  const builder = new ASTBuilder(diag);
  const scopeStack = new ScopeStack();
  let tabWarningEmitted = false;

  const lines = normalizeInput(input).split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const stripped = stripInlineComment(lines[i]);
    const { indent, hasTabs } = measureIndent(stripped);

    if (hasTabs && !tabWarningEmitted) {
      diag.info(lineNum, 'Tab characters detected. Normalizing to 2 spaces per tab.');
      tabWarningEmitted = true;
    }

    const trimmed = stripped.trim();
    if (trimmed === '' || trimmed === '---') continue;

    // Dedent: pop scope stack
    scopeStack.popToIndent(indent);

    // Try each line pattern in priority order
    if (tryPortEdges(trimmed, lineNum, indent, builder, scopeStack)) continue;
    if (tryBidiEdges(trimmed, lineNum, indent, builder, scopeStack)) continue;
    if (tryDirectedEdges(trimmed, lineNum, indent, builder, scopeStack)) continue;
    if (tryGroupStart(trimmed, lineNum, indent, builder, scopeStack)) continue;
    if (tryAnimationBlock(trimmed, lineNum, indent, builder, scopeStack)) continue;
    if (tryNodeBlock(trimmed, lineNum, indent, builder, scopeStack, diag)) continue;
    if (tryNodeInline(trimmed, lineNum, indent, builder, scopeStack, diag)) continue;
    if (tryKV(trimmed, lineNum, builder, scopeStack, diag)) continue;

    diag.error(lineNum, `Unrecognized syntax: "${trimmed}"`);
  }

  const ast = builder.build();

  // Post-parse validation
  const validationDiags = validateAst(ast, builder.declaredNodeIds);
  diag.merge(validationDiags);

  return { ast, diagnostics: diag.getAll() };
}

// ── Input Normalization ──

function normalizeInput(input: string): string {
  let normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (normalized.charCodeAt(0) === 0xfeff) {
    normalized = normalized.substring(1);
  }
  return normalized;
}

// ── Line Matchers ──
// Each returns `true` if the line was consumed.

function tryPortEdges(
  trimmed: string,
  lineNum: number,
  indent: number,
  builder: ASTBuilder,
  scope: ScopeStack,
): boolean {
  let match: RegExpMatchArray | null;

  // Port-to-port directed block
  match = trimmed.match(PORT_EDGE_BLOCK_RE);
  if (match) {
    const idx = builder.addEdge({
      from: match[1], to: match[3],
      props: { fromPort: match[2], toPort: match[4] },
      loc: { line: lineNum, col: indent + 1 },
    });
    scope.push(ScopeStack.edge(idx, indent, lineNum));
    return true;
  }

  // Port-to-port directed inline
  match = trimmed.match(PORT_EDGE_INLINE_RE);
  if (match) {
    const props: VrdEdgeProps = { fromPort: match[2], toPort: match[4] };
    if (match[5] !== undefined) props.label = match[5];
    builder.addEdge({
      from: match[1], to: match[3], props,
      loc: { line: lineNum, col: indent + 1 },
    });
    return true;
  }

  // Port-to-port bidi block
  match = trimmed.match(PORT_BIDI_EDGE_BLOCK_RE);
  if (match) {
    const idx = builder.addEdge({
      from: match[1], to: match[3],
      props: { fromPort: match[2], toPort: match[4], bidirectional: true },
      loc: { line: lineNum, col: indent + 1 },
    });
    scope.push(ScopeStack.edge(idx, indent, lineNum));
    return true;
  }

  // Port-to-port bidi inline
  match = trimmed.match(PORT_BIDI_EDGE_INLINE_RE);
  if (match) {
    const props: VrdEdgeProps = {
      fromPort: match[2], toPort: match[4], bidirectional: true,
    };
    if (match[5] !== undefined) props.label = match[5];
    builder.addEdge({
      from: match[1], to: match[3], props,
      loc: { line: lineNum, col: indent + 1 },
    });
    return true;
  }

  return false;
}

function tryBidiEdges(
  trimmed: string,
  lineNum: number,
  indent: number,
  builder: ASTBuilder,
  scope: ScopeStack,
): boolean {
  let match: RegExpMatchArray | null;

  match = trimmed.match(BIDI_EDGE_BLOCK_RE);
  if (match) {
    const idx = builder.addEdge({
      from: match[1], to: match[2],
      props: { bidirectional: true },
      loc: { line: lineNum, col: indent + 1 },
    });
    scope.push(ScopeStack.edge(idx, indent, lineNum));
    return true;
  }

  match = trimmed.match(BIDI_EDGE_INLINE_RE);
  if (match) {
    const props: VrdEdgeProps = { bidirectional: true };
    if (match[3] !== undefined) props.label = match[3];
    builder.addEdge({
      from: match[1], to: match[2], props,
      loc: { line: lineNum, col: indent + 1 },
    });
    return true;
  }

  return false;
}

function tryDirectedEdges(
  trimmed: string,
  lineNum: number,
  indent: number,
  builder: ASTBuilder,
  scope: ScopeStack,
): boolean {
  let match: RegExpMatchArray | null;

  match = trimmed.match(EDGE_BLOCK_RE);
  if (match) {
    const idx = builder.addEdge({
      from: match[1], to: match[2], props: {},
      loc: { line: lineNum, col: indent + 1 },
    });
    scope.push(ScopeStack.edge(idx, indent, lineNum));
    return true;
  }

  match = trimmed.match(EDGE_INLINE_RE);
  if (match) {
    const props: VrdEdgeProps = {};
    if (match[3] !== undefined) props.label = match[3];
    builder.addEdge({
      from: match[1], to: match[2], props,
      loc: { line: lineNum, col: indent + 1 },
    });
    return true;
  }

  return false;
}

function tryGroupStart(
  trimmed: string,
  lineNum: number,
  indent: number,
  builder: ASTBuilder,
  scope: ScopeStack,
): boolean {
  const match = trimmed.match(GROUP_START_RE);
  if (!match) return false;

  const groupId = match[1];
  const label = match[2] || undefined;
  const parentGroup = scope.findParentGroup();

  builder.addGroup(groupId, label, lineNum,    parentGroup?.groupId,
  );

  scope.push(ScopeStack.group(groupId, indent, lineNum));
  return true;
}

function tryAnimationBlock(
  trimmed: string,
  lineNum: number,
  indent: number,
  builder: ASTBuilder,
  scope: ScopeStack,
): boolean {
  const match = trimmed.match(ANIMATION_BLOCK_RE);
  if (!match) return false;

  const name = match[1];
  builder.addTimeline(name);
  scope.push(ScopeStack.animation(name, indent, lineNum));
  return true;
}

function tryNodeBlock(
  trimmed: string,
  lineNum: number,
  indent: number,
  builder: ASTBuilder,
  scope: ScopeStack,
  diag: DiagnosticCollector,
): boolean {
  const match = trimmed.match(NODE_BLOCK_RE);
  if (!match) return false;

  const type = match[1];
  const localId = match[2];

  if (!KNOWN_NODE_TYPES_SET.has(type)) {
    diag.warning(lineNum, `Unknown node type "${type}". It will be rendered with a default shape.`);
  }

  const parentGroup = scope.findParentGroup();
  const fullId = builder.resolveFullId(localId, parentGroup);

  builder.addNode(fullId, type, {}, lineNum, parentGroup);
  scope.push(ScopeStack.node(fullId, indent, lineNum));
  return true;
}

function tryNodeInline(
  trimmed: string,
  lineNum: number,
  indent: number,
  builder: ASTBuilder,
  scope: ScopeStack,
  diag: DiagnosticCollector,
): boolean {
  const match = trimmed.match(NODE_INLINE_RE);
  if (!match) return false;

  const type = match[1];
  const localId = match[2];
  const currentScope = scope.current;

  // Contextual safety: warn if appears inside a node or edge block
  if (currentScope.type === 'node' || currentScope.type === 'edge') {
    diag.warning(
      lineNum,
      `"${trimmed}" looks like a node declaration inside a ${currentScope.type} block. ` +
      `Did you mean "key: value" syntax?`,
    );
    // Fall through to KV — don't consume the line
    return false;
  }

  if (!KNOWN_NODE_TYPES_SET.has(type)) {
    diag.warning(lineNum, `Unknown node type "${type}". It will be rendered with a default shape.`);
  }

  const parentGroup = scope.findParentGroup();
  const fullId = builder.resolveFullId(localId, parentGroup);

  builder.addNode(fullId, type, {}, lineNum, parentGroup);
  return true;
}

function tryKV(
  trimmed: string,
  lineNum: number,
  builder: ASTBuilder,
  scope: ScopeStack,
  diag: DiagnosticCollector,
): boolean {
  const match = trimmed.match(KV_RE);
  if (!match) return false;

  const key = match[1];
  const rawVal = match[2].trim();
  const currentScope = scope.current;

  switch (currentScope.type) {
    case 'root':
      handleConfigKV(key, rawVal, lineNum, builder, diag);
      break;

    case 'node':
      handleNodeKV(key, rawVal, lineNum, currentScope.nodeId, builder, diag);
      break;

    case 'edge':
      handleEdgeKV(key, rawVal, lineNum, currentScope.edgeIndex, builder, diag);
      break;

    case 'group':
      handleGroupKV(key, rawVal, lineNum, currentScope.groupId, builder, diag);
      break;

    case 'animation':
      handleAnimationKV(key, rawVal, lineNum, currentScope.timelineName, builder, diag);
      break;
  }

  return true;
}