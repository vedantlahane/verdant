import {
  KNOWN_NODE_TYPES,
  KNOWN_CONFIG_KEYS,
  VALID_LAYOUTS,
  VALID_SIZES,
  VALID_EDGE_STYLES,
} from "@verdant/parser";

/** All valid node type keywords for syntax highlighting + autocomplete */
export const NODE_TYPES: readonly string[] = KNOWN_NODE_TYPES;

/** Config keys for autocomplete */
export const CONFIG_KEYS = [...KNOWN_CONFIG_KEYS];

/** Node/edge property keys for autocomplete */
export const PROP_KEYS = [
  "label", "color", "size", "glow", "icon", "position",
  "opacity", "scale", "description", "status",
  // Edge-specific
  "style", "width", "bidirectional", "fromPort", "toPort",
];

/** Theme names for autocomplete */
export const THEME_VALUES = [
  "moss", "sage", "fern", "bloom", "ash",
  "dusk", "stone", "ember", "frost",
];

/** Layout values from parser */
export const LAYOUT_VALUES = [...VALID_LAYOUTS];

/** Size values from parser (including xs) */
export const SIZE_VALUES = [...VALID_SIZES];

/** Edge style values from parser */
export const EDGE_STYLE_VALUES = [...VALID_EDGE_STYLES];

/** Boolean completions */
export const BOOL_VALUES = ["true", "false"];