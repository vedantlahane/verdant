// parser/index.ts — Public API barrel

// ── Parser API ──
export { parseVrd, parseVrdSafe } from './parser';

// ── AST Builder (for programmatic construction) ──
export { ASTBuilder } from './builder';

// ── Errors & Diagnostics ──
export { VrdParserError, DiagnosticCollector } from './errors';

// ── Types ──
export type {
  VrdAST,
  VrdNode,
  VrdNodeProps,
  VrdEdge,
  VrdEdgeProps,
  VrdGroup,
  VrdGroupProps,
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
  NodeStatus,
  AnimationType,
  RoutingType,
  PortSide,
  BadgePosition,
  VrdBadge,
  VrdPort,
  VrdAnimationTimeline,
  VrdAnimationKeyframe,
} from './types';

// ── Constants (for tooling / editor integrations) ──
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
  VALID_SHAPES,
  VALID_STATUSES,
  VALID_ANIMATION_TYPES,
  VALID_ROUTING_TYPES,
  VALID_PORT_SIDES,
  VALID_BADGE_POSITIONS,
  KNOWN_NODE_PROPS,
  KNOWN_EDGE_PROPS,
} from './constants';

// ── Patterns (for external tooling / syntax highlighting) ──
export {
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
  isValidHexColor,
} from './patterns';

// ── Value Parsers (for external tooling) ──
export { parseValue, parsePosition, parseWidth } from './values';
export type { VrdValue } from './values';

// ── Validation (can run standalone on any AST) ──
export { validateAst } from './validate';

// ── Pretty Printer ──
export { printVrd } from './printer';

// ── Scope (for advanced tooling / LSP) ──
export { ScopeStack } from './scope';
export type {
  Scope,
  RootScope,
  GroupScope,
  NodeScope,
  EdgeScope,
  AnimationScope,
} from './scope';