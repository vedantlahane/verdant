// parser/values.ts — Value parsing helpers

/**
 * Parsed value type — narrower than `unknown`, covers all .vrd value types.
 */
export type VrdValue = string | number | boolean | null;

/**
 * Parse a raw string value from a KV pair into a typed value.
 * Handles: quoted strings, booleans, numbers, null/none, plain strings.
 */
export function parseValue(raw: string): VrdValue {
  const trimmed = raw.trim();
  if (trimmed === '') return '';

  // Quoted string (single or double)
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1);
  }

  // Booleans
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // null / undefined keywords
  if (trimmed === 'null' || trimmed === 'none') return null;

  // Numbers (integers and floats, not hex colors starting with #)
  if (!trimmed.startsWith('#') && !isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  // Plain string (includes hex colors like #52B788)
  return trimmed;
}

/**
 * Parse a `position: x,y,z` value.
 * Accepts: `1,2,3` or `1, 2, 3` or `1 2 3`
 */
export function parsePosition(
  raw: string,
): { x: number; y: number; z: number } | null {
  const parts = raw.includes(',')
    ? raw.split(',').map((s) => s.trim())
    : raw.trim().split(/\s+/);

  if (parts.length !== 3) return null;

  const [x, y, z] = parts.map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }

  return { x, y, z };
}

/**
 * Parse a width value, ensuring it's a positive finite number.
 */
export function parseWidth(raw: string): number | null {
  const val = Number(raw);
  if (!Number.isFinite(val) || val <= 0) return null;
  return val;
}