// features/playground/constants/editor.ts

import {
  KNOWN_NODE_TYPES,
  KNOWN_CONFIG_KEYS,
  VALID_LAYOUTS,
  VALID_SIZES,
  VALID_EDGE_STYLES,
} from "@verdant/parser";

// ═══════════════════════════════════════════════════
// Node Types
// ═══════════════════════════════════════════════════

/** All valid node type keywords for syntax highlighting + autocomplete */
export const NODE_TYPES: readonly string[] = Object.freeze([...KNOWN_NODE_TYPES]);

// ═══════════════════════════════════════════════════
// Config & Property Keys
// ═══════════════════════════════════════════════════

/** Top-level config keys (theme, layout, etc.) — from parser */
export const CONFIG_KEYS: readonly string[] = Object.freeze([...KNOWN_CONFIG_KEYS]);

/** Node/edge property keys for autocomplete */
export const PROP_KEYS: readonly string[] = Object.freeze([
  // Core node props
  "label", "color", "size", "glow", "icon", "position",
  "opacity", "scale", "description", "status",
  // v2 node props
  "shape", "badge", "port", "enter", "exit", "animation-duration",
  "collapsed",
  // Edge-specific
  "style", "width", "bidirectional", "fromPort", "toPort",
  "routing", "flow", "flow-speed", "flow-count", "flow-color",
] as const);

// ═══════════════════════════════════════════════════
// Value Enums (for autocomplete suggestions)
// ═══════════════════════════════════════════════════

/** Theme names — all built-in accent themes */
export const THEME_VALUES: readonly string[] = Object.freeze([
  "moss", "sage", "fern", "bloom", "ash",
  "dusk", "stone", "ember", "frost",
] as const);

/** Layout algorithm values — from parser */
export const LAYOUT_VALUES: readonly string[] = Object.freeze([...VALID_LAYOUTS]);

/** Size values — from parser (includes xs) */
export const SIZE_VALUES: readonly string[] = Object.freeze([...VALID_SIZES]);

/** Edge style values — from parser */
export const EDGE_STYLE_VALUES: readonly string[] = Object.freeze([...VALID_EDGE_STYLES]);

/** Boolean completions */
export const BOOL_VALUES: readonly string[] = Object.freeze(["true", "false"] as const);

/** 3D shape types (14 ShapeType values) */
export const SHAPE_VALUES: readonly string[] = Object.freeze([
  "cube", "cylinder", "diamond", "sphere", "torus",
  "hexagon", "pentagon", "octagon", "ring", "box",
  "cone", "capsule", "icosahedron", "plane",
] as const);

/** Node health status values */
export const STATUS_VALUES: readonly string[] = Object.freeze([
  "healthy", "warning", "error", "unknown",
] as const);

/** Edge routing type values */
export const ROUTING_VALUES: readonly string[] = Object.freeze([
  "straight", "curved", "orthogonal",
] as const);

/** Enter/exit animation type values */
export const ANIMATION_TYPE_VALUES: readonly string[] = Object.freeze([
  "fade", "scale", "slide",
] as const);

// ═══════════════════════════════════════════════════
// Autocomplete Value Mapping
//
// Maps property-key regex patterns to their valid values.
// Used by useMonacoLanguage to generate value completions.
// Frozen once at module level — zero allocation in the
// completion provider hot path.
// ═══════════════════════════════════════════════════

export interface ValueCompletion {
  readonly pattern: RegExp;
  readonly values: readonly string[];
}

export const VALUE_COMPLETIONS: readonly ValueCompletion[] = Object.freeze([
  { pattern: /theme:\s*/, values: THEME_VALUES },
  { pattern: /layout:\s*/, values: LAYOUT_VALUES },
  { pattern: /size:\s*/, values: SIZE_VALUES },
  { pattern: /glow:\s*/, values: BOOL_VALUES },
  { pattern: /style:\s*/, values: EDGE_STYLE_VALUES },
  { pattern: /bidirectional:\s*/, values: BOOL_VALUES },
  { pattern: /shape:\s*/, values: SHAPE_VALUES },
  { pattern: /status:\s*/, values: STATUS_VALUES },
  { pattern: /routing:\s*/, values: ROUTING_VALUES },
  { pattern: /enter:\s*/, values: ANIMATION_TYPE_VALUES },
  { pattern: /exit:\s*/, values: ANIMATION_TYPE_VALUES },
  { pattern: /flow:\s*/, values: BOOL_VALUES },
  { pattern: /collapsed:\s*/, values: BOOL_VALUES },
  { pattern: /minimap:\s*/, values: BOOL_VALUES },
  { pattern: /post-processing:\s*/, values: BOOL_VALUES },
  { pattern: /snap-to-grid:\s*/, values: BOOL_VALUES },
] as const);

// ═══════════════════════════════════════════════════
// Monaco Syntax — Precomputed Patterns
//
// Built once at module load time so the tokenizer
// and completion provider never re-join arrays.
// ═══════════════════════════════════════════════════

/** Pipe-joined node types for RegExp construction */
export const NODE_TYPES_PATTERN: string = NODE_TYPES.join("|");

/** Pipe-joined config keys for RegExp construction */
export const CONFIG_KEYS_PATTERN: string = CONFIG_KEYS.join("|");

/** Pipe-joined property keys for RegExp construction */
export const PROP_KEYS_PATTERN: string = PROP_KEYS.join("|");

/** Pre-built regex for matching node declarations in source text */
export const NODE_LINE_REGEX: RegExp = new RegExp(
  `^\\s*(?:${NODE_TYPES_PATTERN})\\s+([\\w][\\w.-]*)`,
);