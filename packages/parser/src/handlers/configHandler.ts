// parser/handlers/configHandler.ts

import type { ASTBuilder } from '../builder';
import type { DiagnosticCollector } from '../errors';
import { parseValue } from '../values';

const BOOLEAN_CONFIG_KEYS = new Set([
  'minimap', 'post-processing', 'snap-to-grid',
]);

const NUMERIC_CONFIG_KEYS = new Set([
  'bloom-intensity', 'grid-size', 'layer-spacing', 'node-spacing',
]);

export function handleConfigKV(
  key: string,
  rawVal: string,
  lineNum: number,
  builder: ASTBuilder,
  diag: DiagnosticCollector,
): void {
  if (BOOLEAN_CONFIG_KEYS.has(key)) {
    builder.setConfig(key, rawVal.trim() === 'true');
    return;
  }

  if (NUMERIC_CONFIG_KEYS.has(key)) {
    const num = Number(rawVal);
    if (!Number.isFinite(num)) {
      diag.warning(lineNum, `Config "${key}" should be a number, got "${rawVal}".`);
    }
    builder.setConfig(key, Number.isFinite(num) ? num : rawVal.trim());
    return;
  }

  switch (key) {
    case 'layout':
    case 'camera':
    case 'direction': {
      const val = rawVal.trim();
      if (typeof val !== 'string' || val === '') {
        diag.warning(lineNum, `Config "${key}" should be a non-empty string.`);
      }
      builder.setConfig(key, val);
      break;
    }

    default:
      builder.setConfig(key, parseValue(rawVal));
      break;
  }
}
