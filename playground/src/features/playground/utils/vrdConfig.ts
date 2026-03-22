/**
 * Helper to toggle or set a value in .vrd source code.
 *
 * .vrd files use top-level `key: value` lines (NOT a `config {}` block).
 * Example:
 *   theme: moss
 *   layout: auto
 *   minimap: true
 *
 * This function finds the first occurrence of `key: <value>` as a top-level
 * line (not indented inside a node/edge block) and replaces the value.
 *
 * Edge cases handled:
 * - Key exists → updates value (or toggles boolean if newValue omitted)
 * - Key doesn't exist → inserts after the last existing config line at top
 * - Inline comments after value → preserved
 * - Lines inside node/edge blocks with same key name → NOT matched (indent check)
 * - Empty code → creates "key: value" as the first line
 */
export function toggleVrdConfigLine(
  code: string,
  key: string,
  newValue?: string | boolean,
): string {
  const lines = code.split('\n');
  const escapedKey = escapeRegExp(key);
  // Match top-level (0 indent) `key: value` with optional trailing comment
  const keyRegex = new RegExp(`^(${escapedKey}\\s*:\\s*)([^\\n#]*)(#.*)?$`, 'i');

  // Find the line index of an existing top-level key
  let foundIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Only match non-indented lines (top-level config)
    if (/^\s/.test(line)) continue;
    if (keyRegex.test(line)) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex !== -1) {
    // Key exists — update or toggle
    const line = lines[foundIndex];
    const match = line.match(keyRegex)!;
    let resolvedValue: string;

    if (newValue !== undefined) {
      resolvedValue = String(newValue);
    } else {
      // Toggle boolean
      const current = match[2].trim().toLowerCase();
      resolvedValue = current === 'true' ? 'false' : 'true';
    }

    const trailingComment = match[3] ? ` ${match[3].trim()}` : '';
    lines[foundIndex] = `${match[1]}${resolvedValue}${trailingComment}`;
    return lines.join('\n');
  }

  // Key doesn't exist — insert it.
  // Strategy: find the last consecutive top-level `key: value` line from the top,
  // and insert the new line after it.
  const val = newValue !== undefined ? String(newValue) : 'true';
  const newLine = `${key}: ${val}`;

  let insertAfter = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Skip blank lines and comments at the very top
    if (trimmed === '' || trimmed.startsWith('#')) {
      if (insertAfter === -1) {
        // Still in the header comment/blank area — keep going
        continue;
      }
      // We've passed a config line and hit a blank/comment — stop
      break;
    }
    // Top-level key: value (no indent, has colon)
    if (!/^\s/.test(lines[i]) && /^[a-zA-Z][\w-]*\s*:/.test(trimmed)) {
      insertAfter = i;
      continue;
    }
    // Hit a non-config line (node declaration, edge, group, etc.) — stop
    break;
  }

  if (insertAfter >= 0) {
    // Insert after the last config line
    lines.splice(insertAfter + 1, 0, newLine);
  } else {
    // No config lines found — check if there's a header comment
    let firstNonComment = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === '' || trimmed.startsWith('#')) {
        firstNonComment = i + 1;
        continue;
      }
      break;
    }
    lines.splice(firstNonComment, 0, newLine);
  }

  return lines.join('\n');
}

/** Escape special regex characters in a string */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
