// features/playground/constants/index.ts

/**
 * Barrel file for playground constants.
 *
 * Editor constants (node types, config keys, values) are the
 * single source of truth — derived from @verdant/parser where possible.
 *
 * Presets are the built-in .vrd examples for the preset picker.
 */

// ── Editor / Autocomplete constants ──
export {
  NODE_TYPES,
  CONFIG_KEYS,
  PROP_KEYS,
  THEME_VALUES,
  LAYOUT_VALUES,
  SIZE_VALUES,
  EDGE_STYLE_VALUES,
  BOOL_VALUES,
  SHAPE_VALUES,
  STATUS_VALUES,
  ROUTING_VALUES,
  ANIMATION_TYPE_VALUES,
  VALUE_COMPLETIONS,
  NODE_TYPES_PATTERN,
  CONFIG_KEYS_PATTERN,
  PROP_KEYS_PATTERN,
  NODE_LINE_REGEX,
} from "./editor";

export type { ValueCompletion } from "./editor";

// ── Presets ──
export {
  PRESETS,
  PRESET_KEYS,
  DEFAULT_PRESET_KEY,
} from "./presets";