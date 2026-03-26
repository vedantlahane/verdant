// parser/handlers/groupHandler.ts

import type { LayoutType } from '../types';
import type { ASTBuilder } from '../builder';
import type { DiagnosticCollector } from '../errors';
import { VALID_LAYOUTS } from '../constants';
import { parseValue } from '../values';

export function handleGroupKV(
  key: string,
  rawVal: string,
  lineNum: number,
  groupId: string,
  builder: ASTBuilder,
  diag: DiagnosticCollector,
): void {
  const props = builder.getGroupProps(groupId);
  if (!props) return;

  switch (key) {
    case 'label': {
      // ✅ Fixed: parseValue called only once (was called 3x in original)
      const val = parseValue(rawVal);
      builder.setGroupLabel(groupId, typeof val === 'string' ? val : String(val));
      break;
    }

    case 'collapsed':
      props.collapsed = rawVal.trim() === 'true';
      break;

    case 'layout': {
      const val = rawVal.trim();
      if (!VALID_LAYOUTS.has(val)) {
        diag.warning(lineNum, `Invalid group layout "${val}". Valid: ${[...VALID_LAYOUTS].join(', ')}`);
      }
      props.layout = val as LayoutType;
      break;
    }

    case 'color':
    case 'style':
    case 'description':
      props[key] = parseValue(rawVal);
      break;

    default:
      diag.info(lineNum, `Unknown group property "${key}" on group "${groupId}".`);
      props[key] = parseValue(rawVal);
      break;
  }
}
