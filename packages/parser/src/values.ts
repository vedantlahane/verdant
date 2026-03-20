// ============================================
// Value parsing helpers
// ============================================

/**
 * Parse a raw string value from a KV pair into a typed value.
 * Handles: quoted strings, booleans, numbers, plain strings.
 */
export function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return '';

  // Quoted string (single or double)
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Booleans
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // null / undefined keywords
  if (trimmed === 'null' || trimmed === 'none') return null;

  // Numbers (integers and floats, not hex colors starting with #)
  if (!trimmed.startsWith('#') && trimmed !== '' && !isNaN(Number(trimmed))) {
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
  // Try comma-separated first
  let parts: string[];
  if (raw.includes(',')) {
    parts = raw.split(',').map((s) => s.trim());
  } else {
    // Space-separated fallback
    parts = raw.trim().split(/\s+/);
  }

  if (parts.length !== 3) return null;

  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;

  return { x: nums[0], y: nums[1], z: nums[2] };
}

/**
 * Parse a width value, ensuring it's a positive finite number.
 */
export function parseWidth(raw: string): number | null {
  const val = Number(raw);
  if (!Number.isFinite(val) || val <= 0) return null;
  return val;
}