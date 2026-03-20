// ── Parser API ──
export { parseVrd, parseVrdSafe } from './parser';

// ── Types ──
export { VrdParserError } from './types';
export {
  KNOWN_NODE_TYPES,
  KNOWN_NODE_TYPES_SET,
  NODE_TYPE_CATEGORIES,
  NODE_TYPE_SHAPE_HINTS,
  KNOWN_CONFIG_KEYS,
  VALID_LAYOUTS,
  VALID_CAMERAS,
  VALID_SIZES,
  VALID_EDGE_STYLES,
} from './types';

export type {
  VrdAST,
  VrdNode,
  VrdNodeProps,
  VrdEdge,
  VrdEdgeProps,
  VrdGroup,
  VrdConfig,
  VrdParseResult,
  VrdDiagnostic,
  DiagnosticSeverity,
  SourceLocation,
  KnownNodeType,
  LayoutType,
  CameraType,
  NodeSize,
  EdgeStyle,
  ShapeType,
} from './types';

// ── Patterns (for tooling / editor integrations) ──
export {
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
  isValidHexColor,
} from './patterns';

// ── Value parsers (for external tooling) ──
export { parseValue, parsePosition, parseWidth } from './values';

// ── Validation (can be used standalone) ──
export { validateAst } from './validate';