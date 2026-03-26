// parser/validate.ts — Post-parse validation pass

import type { VrdAST, VrdGroup, VrdDiagnostic } from './types';
import {
  VALID_LAYOUTS, VALID_CAMERAS, VALID_SIZES,
  VALID_EDGE_STYLES, VALID_STATUSES, VALID_SHAPES,
  VALID_ROUTING_TYPES, KNOWN_CONFIG_KEYS,
} from './constants';

/** Maximum group nesting depth before we bail. */
const MAX_GROUP_DEPTH = 64;

/**
 * Post-parse validation pass.
 * Returns diagnostics beyond what the line-by-line parser catches.
 *
 * Separated from the parser so it can run independently on
 * programmatically-constructed ASTs.
 */
export function validateAst(
  ast: VrdAST,
  declaredNodeIds: ReadonlySet<string>,
): VrdDiagnostic[] {
  const diagnostics: VrdDiagnostic[] = [];

  validateConfig(ast, diagnostics);
  validateEdges(ast, declaredNodeIds, diagnostics);
  validateNodes(ast, diagnostics);
  validateGroups(ast, declaredNodeIds, diagnostics);

  return diagnostics;
}

// ── Config ──

function validateConfig(ast: VrdAST, diags: VrdDiagnostic[]): void {
  for (const key of Object.keys(ast.config)) {
    if (key === 'animations') continue; // handled separately
    if (!KNOWN_CONFIG_KEYS.has(key)) {
      diags.push({
        line: 0,
        severity: 'info',
        message: `Unknown config key "${key}". Known: ${[...KNOWN_CONFIG_KEYS].join(', ')}`,
      });
    }
  }

  const { layout, camera } = ast.config;

  if (layout && !VALID_LAYOUTS.has(layout)) {
    diags.push({
      line: 0,
      severity: 'warning',
      message: `Invalid layout "${layout}". Valid: ${[...VALID_LAYOUTS].join(', ')}`,
    });
  }

  if (camera && !VALID_CAMERAS.has(camera)) {
    diags.push({
      line: 0,
      severity: 'warning',
      message: `Invalid camera "${camera}". Valid: ${[...VALID_CAMERAS].join(', ')}`,
    });
  }
}

// ── Edges (references, self-loops, duplicates, properties) ──

function validateEdges(
  ast: VrdAST,
  declaredNodeIds: ReadonlySet<string>,
  diags: VrdDiagnostic[],
): void {
  const seen = new Set<string>();

  for (const edge of ast.edges) {
    const line = edge.loc?.line ?? 0;

    // Undeclared source
    if (!declaredNodeIds.has(edge.from)) {
      diags.push({
        line,
        severity: 'warning',
        message: `Edge references undeclared node "${edge.from}"`,
      });
    }

    // Undeclared target
    if (!declaredNodeIds.has(edge.to)) {
      diags.push({
        line,
        severity: 'warning',
        message: `Edge references undeclared node "${edge.to}"`,
      });
    }

    // Self-loop
    if (edge.from === edge.to) {
      diags.push({
        line,
        severity: 'warning',
        message: `Self-referencing edge: "${edge.from}" → "${edge.to}"`,
      });
    }

    // Duplicate
    const edgeKey = `${edge.from}->${edge.to}`;
    if (seen.has(edgeKey)) {
      diags.push({
        line,
        severity: 'info',
        message: `Duplicate edge: "${edge.from}" → "${edge.to}"`,
      });
    }
    seen.add(edgeKey);

    // Property validation
    if (edge.props.style && !VALID_EDGE_STYLES.has(edge.props.style)) {
      diags.push({
        line,
        severity: 'warning',
        message: `Invalid edge style "${edge.props.style}". Valid: ${[...VALID_EDGE_STYLES].join(', ')}`,
      });
    }

    if (edge.props.width !== undefined) {
      if (typeof edge.props.width !== 'number' || !Number.isFinite(edge.props.width) || edge.props.width <= 0) {
        diags.push({
          line,
          severity: 'warning',
          message: `Invalid edge width "${edge.props.width}". Must be a positive number.`,
        });
      }
    }

    if (edge.props.routing && !VALID_ROUTING_TYPES.has(edge.props.routing)) {
      diags.push({
        line,
        severity: 'error',
        message: `Invalid routing "${edge.props.routing}". Valid: ${[...VALID_ROUTING_TYPES].join(', ')}`,
      });
    }
  }
}

// ── Nodes (properties) ──

function validateNodes(ast: VrdAST, diags: VrdDiagnostic[]): void {
  for (const node of ast.nodes) {
    const line = node.loc?.line ?? 0;
    const { props } = node;

    // Size
    if (props.size && !VALID_SIZES.has(props.size)) {
      diags.push({
        line,
        severity: 'warning',
        message: `Invalid size "${props.size}" on node "${node.id}". Valid: ${[...VALID_SIZES].join(', ')}`,
      });
    }

    // Hex color
    if (props.color && typeof props.color === 'string' && props.color.startsWith('#')) {
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(props.color)) {
        diags.push({
          line,
          severity: 'warning',
          message: `Invalid hex color "${props.color}" on node "${node.id}". Expected: #RGB, #RRGGBB, or #RRGGBBAA`,
        });
      }
    }

    // Position
    if (props.position) {
      const p = props.position;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
        diags.push({
          line,
          severity: 'error',
          message: `Invalid position on node "${node.id}". Expected {x, y, z} with finite numbers.`,
        });
      }
    }

    // Status
    if (props.status && !VALID_STATUSES.has(props.status)) {
      diags.push({
        line,
        severity: 'error',
        message: `Invalid status "${props.status}" on node "${node.id}". Valid: ${[...VALID_STATUSES].join(', ')}`,
      });
    }

    // Shape
    if (props.shape && !VALID_SHAPES.has(props.shape)) {
      diags.push({
        line,
        severity: 'warning',
        message: `Invalid shape "${props.shape}" on node "${node.id}". Valid: ${[...VALID_SHAPES].join(', ')}`,
      });
    }
  }
}

// ── Groups (iterative traversal — no stack overflow) ──

function validateGroups(
  ast: VrdAST,
  declaredNodeIds: ReadonlySet<string>,
  diags: VrdDiagnostic[],
): void {
  const visited = new Set<string>();
  const stack: Array<{ group: VrdGroup; depth: number }> = [];

  for (let i = ast.groups.length - 1; i >= 0; i--) {
    stack.push({ group: ast.groups[i], depth: 0 });
  }

  while (stack.length > 0) {
    const { group, depth } = stack.pop()!;
    const line = group.loc?.line ?? 0;

    if (visited.has(group.id)) {
      diags.push({
        line,
        severity: 'error',
        message: `Circular group reference detected: "${group.id}"`,
      });
      continue;
    }

    if (depth > MAX_GROUP_DEPTH) {
      diags.push({
        line,
        severity: 'error',
        message: `Group nesting exceeds maximum depth (${MAX_GROUP_DEPTH}): "${group.id}"`,
      });
      continue;
    }

    visited.add(group.id);

    if (group.children.length === 0 && group.groups.length === 0) {
      diags.push({
        line,
        severity: 'info',
        message: `Group "${group.id}" is empty`,
      });
    }

    for (const childId of group.children) {
      if (!declaredNodeIds.has(childId)) {
        diags.push({
          line,
          severity: 'warning',
          message: `Group "${group.id}" references undeclared node "${childId}"`,
        });
      }
    }

    for (let i = group.groups.length - 1; i >= 0; i--) {
      stack.push({ group: group.groups[i], depth: depth + 1 });
    }
  }
}