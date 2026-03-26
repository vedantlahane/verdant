// parser/handlers/animationHandler.ts

import type { ASTBuilder } from '../builder';
import type { DiagnosticCollector } from '../errors';
import { parseValue } from '../values';

export function handleAnimationKV(
  key: string,
  rawVal: string,
  lineNum: number,
  timelineName: string,
  builder: ASTBuilder,
  diag: DiagnosticCollector,
): void {
  switch (key) {
    case 'duration': {
      const val = Number(rawVal);
      if (!Number.isFinite(val) || val < 0) {
        diag.warning(lineNum, `Invalid animation duration "${rawVal}". Expected non-negative number.`);
      } else {
        builder.setTimelineDuration(timelineName, val);
      }
      break;
    }

    case 'target':
      builder.setPendingKeyframeField(timelineName, 'target', rawVal.trim());
      break;

    case 'property':
      builder.setPendingKeyframeField(timelineName, 'property', rawVal.trim());
      break;

    case 'from':
      builder.setPendingKeyframeField(timelineName, 'from', parseValue(rawVal));
      break;

    case 'to':
      builder.setPendingKeyframeField(timelineName, 'to', parseValue(rawVal));
      builder.flushPendingKeyframe(timelineName);
      break;

    default:
      diag.info(lineNum, `Unknown animation property "${key}" in timeline "${timelineName}".`);
      break;
  }
}
