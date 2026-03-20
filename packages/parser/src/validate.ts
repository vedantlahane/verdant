import type { VrdAST, VrdDiagnostic, VrdGroup } from './types';
import {
  VALID_LAYOUTS,
  VALID_CAMERAS,
  VALID_SIZES,
  VALID_EDGE_STYLES,
  KNOWN_CONFIG_KEYS,
} from './types';

/** Maximum group nesting depth before we bail */
const MAX_GROUP_DEPTH = 64;

/**
 * Post-parse validation pass.
 * Returns additional diagnostics beyond what the parser itself catches.
 */
export function validateAst(
  ast: VrdAST,
  declaredNodeIds: ReadonlySet<string>,
): VrdDiagnostic[] {
  const diagnostics: VrdDiagnostic[] = [];

  validateConfig(ast, diagnostics);
  validateEdgeReferences(ast, declaredNodeIds, diagnostics);
  validateEdgeProperties(ast, diagnostics);
  validateNodeProperties(ast, diagnostics);
  validateGroups(ast, declaredNodeIds, diagnostics);

  return diagnostics;
}

// ── Config validation ──

function validateConfig(ast: VrdAST, diags: VrdDiagnostic[]): void {
  for (const key of Object.keys(ast.config)) {
    if (!KNOWN_CONFIG_KEYS.has(key)) {
      diags.push({
        line: 0,
        severity: 'info',
        message: `Unknown config key "${key}". Known keys: ${[...KNOWN_CONFIG_KEYS].join(', ')}`,
      });
    }
  }

  if (ast.config.layout && !VALID_LAYOUTS.has(ast.config.layout as string)) {
    diags.push({
      line: 0,
      severity: 'warning',
      message: `Invalid layout "${ast.config.layout}". Valid options: ${[...VALID_LAYOUTS].join(', ')}`,
    });
  }

  if (ast.config.camera && !VALID_CAMERAS.has(ast.config.camera as string)) {
    diags.push({
      line: 0,
      severity: 'warning',
      message: `Invalid camera "${ast.config.camera}". Valid options: ${[...VALID_CAMERAS].join(', ')}`,
    });
  }
}

// ── Edge reference validation ──

function validateEdgeReferences(
  ast: VrdAST,
  declaredNodeIds: ReadonlySet<string>,
  diags: VrdDiagnostic[],
): void {
  const edgeSet = new Set<string>();

  for (const edge of ast.edges) {
    // Unknown nodes
    if (!declaredNodeIds.has(edge.from)) {
      diags.push({
        line: edge.loc?.line ?? 0,
        severity: 'warning',
        message: `Edge references undeclared node "${edge.from}"`,
      });
    }
    if (!declaredNodeIds.has(edge.to)) {
      diags.push({
        line: edge.loc?.line ?? 0,
        severity: 'warning',
        message: `Edge references undeclared node "${edge.to}"`,
      });
    }

    // Self-referencing
    if (edge.from === edge.to) {
      diags.push({
        line: edge.loc?.line ?? 0,
        severity: 'warning',
        message: `Self-referencing edge: "${edge.from}" → "${edge.to}"`,
      });
    }

    // Duplicate edges
    const edgeKey = `${edge.from}->${edge.to}`;
    if (edgeSet.has(edgeKey)) {
      diags.push({
        line: edge.loc?.line ?? 0,
        severity: 'info',
        message: `Duplicate edge: "${edge.from}" → "${edge.to}"`,
      });
    }
    edgeSet.add(edgeKey);
  }
}

// ── Edge property validation ──

function validateEdgeProperties(ast: VrdAST, diags: VrdDiagnostic[]): void {
  for (const edge of ast.edges) {
    if (
      edge.props.style &&
      !VALID_EDGE_STYLES.has(edge.props.style as string)
    ) {
      diags.push({
        line: edge.loc?.line ?? 0,
        severity: 'warning',
        message: `Invalid edge style "${edge.props.style}". Valid options: ${[...VALID_EDGE_STYLES].join(', ')}`,
      });
    }

    if (edge.props.width !== undefined) {
      if (typeof edge.props.width !== 'number' || !Number.isFinite(edge.props.width) || edge.props.width <= 0) {
        diags.push({
          line: edge.loc?.line ?? 0,
          severity: 'warning',
          message: `Invalid edge width "${edge.props.width}". Must be a positive number.`,
        });
      }
    }
  }
}

// ── Node property validation ──

function validateNodeProperties(ast: VrdAST, diags: VrdDiagnostic[]): void {
  for (const node of ast.nodes) {
    if (node.props.size && !VALID_SIZES.has(node.props.size as string)) {
      diags.push({
        line: node.loc?.line ?? 0,
        severity: 'warning',
        message: `Invalid size "${node.props.size}" on node "${node.id}". Valid options: ${[...VALID_SIZES].join(', ')}`,
      });
    }

    if (node.props.color && typeof node.props.color === 'string') {
      const c = node.props.color;
      // Only validate if it looks like a hex color attempt
      if (c.startsWith('#') && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) {
        diags.push({
          line: node.loc?.line ?? 0,
          severity: 'warning',
          message: `Invalid hex color "${c}" on node "${node.id}". Expected format: #RGB, #RRGGBB, or #RRGGBBAA`,
        });
      }
    }

    if (node.props.position) {
      const p = node.props.position;
      if (
        typeof p !== 'object' || p === null ||
        !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)
      ) {
        diags.push({
          line: node.loc?.line ?? 0,
          severity: 'error',
          message: `Invalid position on node "${node.id}". Expected {x, y, z} with finite numbers.`,
        });
      }
    }
  }
}

// ── Group validation (iterative — no stack overflow) ──

function validateGroups(
  ast: VrdAST,
  declaredNodeIds: ReadonlySet<string>,
  diags: VrdDiagnostic[],
): void {
  const visited = new Set<string>();
  const stack: Array<{ group: VrdGroup; depth: number }> = [];

  // Push top-level groups
  for (let i = ast.groups.length - 1; i >= 0; i--) {
    stack.push({ group: ast.groups[i], depth: 0 });
  }

  while (stack.length > 0) {
    const { group, depth } = stack.pop()!;

    // Circular reference
    if (visited.has(group.id)) {
      diags.push({
        line: group.loc?.line ?? 0,
        severity: 'error',
        message: `Circular group reference detected: "${group.id}"`,
      });
      continue;
    }

    // Depth limit
    if (depth > MAX_GROUP_DEPTH) {
      diags.push({
        line: group.loc?.line ?? 0,
        severity: 'error',
        message: `Group nesting exceeds maximum depth (${MAX_GROUP_DEPTH}): "${group.id}"`,
      });
      continue;
    }

    visited.add(group.id);

    // Empty group
    if (group.children.length === 0 && group.groups.length === 0) {
      diags.push({
        line: group.loc?.line ?? 0,
        severity: 'info',
        message: `Group "${group.id}" is empty`,
      });
    }

    // Children reference undeclared nodes
    for (const childId of group.children) {
      if (!declaredNodeIds.has(childId)) {
        diags.push({
          line: group.loc?.line ?? 0,
          severity: 'warning',
          message: `Group "${group.id}" references undeclared node "${childId}"`,
        });
      }
    }

    // Queue sub-groups
    for (let i = group.groups.length - 1; i >= 0; i--) {
      stack.push({ group: group.groups[i], depth: depth + 1 });
    }
  }
}