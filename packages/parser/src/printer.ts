// parser/printer.ts — Pretty printer for .vrd AST

import type { VrdAST, VrdNode, VrdEdge, VrdGroup, VrdConfig } from './types';

/**
 * Serialize a VrdAST back to .vrd source text.
 * Round-trips cleanly: `parseVrd(printVrd(ast))` ≈ ast.
 */
export function printVrd(ast: VrdAST): string {
  const lines: string[] = [];

  printConfig(ast.config, lines);
  if (lines.length > 0) lines.push('');

  // Top-level nodes (not in any group)
  for (const node of ast.nodes) {
    if (!node.groupId) printNode(node, lines, '');
  }

  // Top-level edges
  for (const edge of ast.edges) {
    printEdge(edge, lines);
  }

  // Top-level groups
  for (const group of ast.groups) {
    printGroup(group, ast, lines, '');
  }

  return lines.join('\n');
}

// ── Config ──

const CONFIG_KEY_ORDER = [
  'theme', 'layout', 'camera', 'minimap', 'post-processing',
  'bloom-intensity', 'snap-to-grid', 'grid-size', 'direction',
  'layer-spacing', 'node-spacing',
] as const;

function printConfig(config: VrdConfig, lines: string[]): void {
  for (const key of CONFIG_KEY_ORDER) {
    if (config[key] !== undefined) {
      lines.push(`${key}: ${config[key]}`);
    }
  }

  if (config.animations) {
    for (const timeline of config.animations) {
      lines.push(`animation ${timeline.name}:`);
      lines.push(`  duration: ${timeline.duration}`);
      for (const kf of timeline.keyframes) {
        lines.push(`  target: ${kf.target}`);
        lines.push(`  property: ${kf.property}`);
        lines.push(`  from: ${formatValue(kf.from)}`);
        lines.push(`  to: ${formatValue(kf.to)}`);
      }
    }
  }
}

// ── Nodes ──

function printNode(node: VrdNode, lines: string[], indent: string): void {
  const hasProps = hasAnyProp(node.props);

  if (hasProps) {
    lines.push(`${indent}${node.type} ${node.id}:`);
    printNodeProps(node, lines, indent + '  ');
  } else {
    lines.push(`${indent}${node.type} ${node.id}`);
  }
}

function printNodeProps(node: VrdNode, lines: string[], indent: string): void {
  const p = node.props;

  if (p.label) lines.push(`${indent}label: "${p.label}"`);
  if (p.color) lines.push(`${indent}color: ${p.color}`);
  if (p.size) lines.push(`${indent}size: ${p.size}`);
  if (p.glow) lines.push(`${indent}glow: true`);
  if (p.icon) lines.push(`${indent}icon: ${p.icon}`);
  if (p.shape) lines.push(`${indent}shape: ${p.shape}`);
  if (p.status) lines.push(`${indent}status: ${p.status}`);
  if (p.enterAnimation) lines.push(`${indent}enter: ${p.enterAnimation}`);
  if (p.exitAnimation) lines.push(`${indent}exit: ${p.exitAnimation}`);
  if (p.animationDuration !== undefined) {
    lines.push(`${indent}animation-duration: ${p.animationDuration}`);
  }
  if (p.opacity !== undefined) lines.push(`${indent}opacity: ${p.opacity}`);
  if (p.scale !== undefined) lines.push(`${indent}scale: ${p.scale}`);

  if (p.badges) {
    for (const b of p.badges) {
      lines.push(`${indent}badge ${b.position}: "${b.content}"`);
    }
  }

  if (p.ports) {
    for (const port of p.ports) {
      lines.push(`${indent}port ${port.name}: ${port.side}`);
    }
  }

  if (p.position) {
    lines.push(`${indent}position: ${p.position.x},${p.position.y},${p.position.z}`);
  }
}

// ── Edges ──

function printEdge(edge: VrdEdge, lines: string[]): void {
  const p = edge.props;
  const fromStr = p.fromPort ? `${edge.from}.${p.fromPort}` : edge.from;
  const toStr = p.toPort ? `${edge.to}.${p.toPort}` : edge.to;
  const arrow = p.bidirectional ? '<->' : '->';

  const hasBlock = !!(
    p.routing || p.flow || p.flowSpeed !== undefined ||
    p.flowCount !== undefined || p.flowColor || p.style ||
    p.color || p.width !== undefined
  );

  if (hasBlock) {
    lines.push(`${fromStr} ${arrow} ${toStr}:`);
    if (p.style) lines.push(`  style: ${p.style}`);
    if (p.color) lines.push(`  color: ${p.color}`);
    if (p.width !== undefined) lines.push(`  width: ${p.width}`);
    if (p.label) lines.push(`  label: "${p.label}"`);
    if (p.routing) lines.push(`  routing: ${p.routing}`);
    if (p.flow) lines.push(`  flow: true`);
    if (p.flowSpeed !== undefined) lines.push(`  flow-speed: ${p.flowSpeed}`);
    if (p.flowCount !== undefined) lines.push(`  flow-count: ${p.flowCount}`);
    if (p.flowColor) lines.push(`  flow-color: "${p.flowColor}"`);
  } else {
    const label = p.label ? `: "${p.label}"` : '';
    lines.push(`${fromStr} ${arrow} ${toStr}${label}`);
  }
}

// ── Groups ──

function printGroup(
  group: VrdGroup,
  ast: VrdAST,
  lines: string[],
  indent: string,
): void {
  const labelStr = group.label ? ` "${group.label}"` : '';
  lines.push(`${indent}group ${group.id}${labelStr}:`);

  if (group.props.collapsed) lines.push(`${indent}  collapsed: true`);
  if (group.props.layout) lines.push(`${indent}  layout: ${group.props.layout}`);

  for (const childId of group.children) {
    const node = ast.nodes.find((n) => n.id === childId);
    if (node) printNode(node, lines, indent + '  ');
  }

  for (const nested of group.groups) {
    printGroup(nested, ast, lines, indent + '  ');
  }
}

// ── Helpers ──

function hasAnyProp(props: Record<string, unknown>): boolean {
  return Object.keys(props).some((k) => props[k] !== undefined);
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return `"${value}"`;
  if (value === null) return 'null';
  return String(value);
}