// ============================================
// Regex patterns for .vrd syntax
// ============================================

// ── Character classes ──
// ID:   alphanumeric + hyphens + dots  (qualified names like backend.web)
// TYPE: alphanumeric + hyphens only    (node types like load-balancer)

const ID_PATTERN = '[\\w][\\w.-]*';
const TYPE_PATTERN = '[a-zA-Z][\\w-]*';

// ── Edge patterns ──

// Directed: `web -> db: "queries"`
export const EDGE_INLINE_RE = new RegExp(
  `^(${ID_PATTERN})\\s*->\\s*(${ID_PATTERN})(?:\\s*:\\s*"([^"]*)")?$`,
);

// Directed block: `web -> db:`  (props follow indented)
export const EDGE_BLOCK_RE = new RegExp(
  `^(${ID_PATTERN})\\s*->\\s*(${ID_PATTERN})\\s*:$`,
);

// Bidirectional: `web <-> db: "sync"`
export const BIDI_EDGE_INLINE_RE = new RegExp(
  `^(${ID_PATTERN})\\s*<->\\s*(${ID_PATTERN})(?:\\s*:\\s*"([^"]*)")?$`,
);

// Bidirectional block: `web <-> db:`
export const BIDI_EDGE_BLOCK_RE = new RegExp(
  `^(${ID_PATTERN})\\s*<->\\s*(${ID_PATTERN})\\s*:$`,
);

// ── Group pattern ──

// `group backend "Backend Services":`
export const GROUP_START_RE = new RegExp(
  `^group\\s+(${ID_PATTERN})(?:\\s+"([^"]*)")?\\s*:$`,
);

// ── Node patterns ──

// Block: `server web-server:`
export const NODE_BLOCK_RE = new RegExp(
  `^(${TYPE_PATTERN})\\s+(${ID_PATTERN})\\s*:$`,
);

// Inline: `server web-server`
export const NODE_INLINE_RE = new RegExp(
  `^(${TYPE_PATTERN})\\s+(${ID_PATTERN})$`,
);

// ── Port-to-port edge patterns ──
// NOTE: These must be checked BEFORE regular edge patterns in the parse loop,
// since `a.port -> b.port` would otherwise match EDGE_INLINE_RE with `a.port` as the full node ID.

// Port-to-port directed edge block: `a.http-out -> b.http-in:`
export const PORT_EDGE_BLOCK_RE = new RegExp(
  `^(${ID_PATTERN})\\.(${ID_PATTERN})\\s*->\\s*(${ID_PATTERN})\\.(${ID_PATTERN})\\s*:$`,
);

// Port-to-port directed edge inline: `a.http-out -> b.http-in` or `a.http-out -> b.http-in: "label"`
// Captures: [nodeId, portName, nodeId, portName, optional label]
export const PORT_EDGE_INLINE_RE = new RegExp(
  `^(${ID_PATTERN})\\.(${ID_PATTERN})\\s*->\\s*(${ID_PATTERN})\\.(${ID_PATTERN})(?:\\s*:\\s*"([^"]*)")?$`,
);

// Port-to-port bidirectional block: `a.port <-> b.port:`
export const PORT_BIDI_EDGE_BLOCK_RE = new RegExp(
  `^(${ID_PATTERN})\\.(${ID_PATTERN})\\s*<->\\s*(${ID_PATTERN})\\.(${ID_PATTERN})\\s*:$`,
);

// Port-to-port bidirectional inline: `a.port <-> b.port` or `a.port <-> b.port: "label"`
export const PORT_BIDI_EDGE_INLINE_RE = new RegExp(
  `^(${ID_PATTERN})\\.(${ID_PATTERN})\\s*<->\\s*(${ID_PATTERN})\\.(${ID_PATTERN})(?:\\s*:\\s*"([^"]*)")?$`,
);

// ── Animation block ──

// Animation block: `animation <name>:`
export const ANIMATION_BLOCK_RE = new RegExp(
  `^animation\\s+(${ID_PATTERN})\\s*:$`,
);

// ── Key-Value ──

// `label: "Web Server"` or `glow: true` or `color: #52B788`
// Also handles compound keys like `port <name>` and `badge <position>`
export const KV_RE = /^([a-zA-Z][\w -]*[\w-]|[a-zA-Z][\w-]*)\s*:\s*(.+)$/;

// ── Inline comment stripping ──
// Strips `# comment` from end of line, respecting quoted strings.
// Uses a simple state machine — no recursion.

export function stripInlineComment(line: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inSingleQuote) {
      if (ch === "'") inSingleQuote = false;
      continue;
    }
    if (inDoubleQuote) {
      if (ch === '"') inDoubleQuote = false;
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
    } else if (ch === '"') {
      inDoubleQuote = true;
    } else if (ch === '#') {
      return line.substring(0, i);
    }
  }

  return line;
}

// ── Leading whitespace measurement ──
// Returns number of spaces. Tabs are normalized to 2 spaces.

export function measureIndent(line: string): { indent: number; hasTabs: boolean } {
  let indent = 0;
  let hasTabs = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === ' ') {
      indent++;
    } else if (ch === '\t') {
      indent += 2;
      hasTabs = true;
    } else {
      break;
    }
  }

  return { indent, hasTabs };
}

// ── Hex color validation ──

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}