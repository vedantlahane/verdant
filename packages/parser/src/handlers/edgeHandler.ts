// parser/handlers/edgeHandler.ts

import type { VrdEdgeProps, RoutingType } from '../types';
import type { ASTBuilder } from '../builder';
import type { DiagnosticCollector } from '../errors';
import { VALID_ROUTING_TYPES, KNOWN_EDGE_PROPS } from '../constants';
import { parseValue, parseWidth } from '../values';

export function handleEdgeKV(
  key: string,
  rawVal: string,
  lineNum: number,
  edgeIndex: number,
  builder: ASTBuilder,
  diag: DiagnosticCollector,
): void {
  const props = builder.getEdgeProps(edgeIndex);
  if (!props) return;

  switch (key) {
    case 'label':
      props.label = coerceString(rawVal);
      break;

    case 'style':
      props.style = rawVal.trim() as VrdEdgeProps['style'];
      break;

    case 'color':
      props.color = coerceString(rawVal);
      break;

    case 'width': {
      const w = parseWidth(rawVal);
      if (w !== null) {
        props.width = w;
      } else {
        diag.warning(lineNum, `Invalid edge width "${rawVal}". Expected positive number.`);
      }
      break;
    }

    case 'bidirectional':
      props.bidirectional = rawVal.trim() === 'true';
      break;

    case 'fromPort':
      props.fromPort = rawVal.trim();
      break;

    case 'toPort':
      props.toPort = rawVal.trim();
      break;

    case 'routing': {
      const val = rawVal.trim();
      if (!VALID_ROUTING_TYPES.has(val)) {
        diag.warning(lineNum, `Invalid routing "${val}". Valid: ${[...VALID_ROUTING_TYPES].join(', ')}`);
      }
      props.routing = val as RoutingType;
      break;
    }

    case 'flow':
      props.flow = rawVal.trim() === 'true';
      break;

    case 'flow-speed': {
      const val = Number(rawVal);
      if (Number.isFinite(val) && val > 0) props.flowSpeed = val;
      else diag.warning(lineNum, `Invalid flow-speed "${rawVal}". Expected positive number.`);
      break;
    }

    case 'flow-count': {
      const val = parseInt(rawVal, 10);
      if (Number.isInteger(val) && val > 0) props.flowCount = val;
      else diag.warning(lineNum, `Invalid flow-count "${rawVal}". Expected positive integer.`);
      break;
    }

    case 'flow-color':
      props.flowColor = coerceString(rawVal);
      break;

    default:
      if (!KNOWN_EDGE_PROPS.has(key)) {
        diag.info(lineNum, `Unknown edge property "${key}". Stored but may not render.`);
      }
      (props as Record<string, unknown>)[key] = parseValue(rawVal);
      break;
  }
}

function coerceString(rawVal: string): string {
  const val = parseValue(rawVal);
  return typeof val === 'string' ? val : String(val);
}
