// parser/handlers/nodeHandler.ts

import type { VrdNodeProps, ShapeType, NodeStatus, AnimationType, BadgePosition, PortSide } from '../types';
import type { ASTBuilder } from '../builder';
import type { DiagnosticCollector } from '../errors';
import {
  VALID_SHAPES, VALID_STATUSES, VALID_ANIMATION_TYPES,
  VALID_BADGE_POSITIONS, VALID_PORT_SIDES, KNOWN_NODE_PROPS,
} from '../constants';
import { parseValue, parsePosition } from '../values';

export function handleNodeKV(
  key: string,
  rawVal: string,
  lineNum: number,
  nodeId: string,
  builder: ASTBuilder,
  diag: DiagnosticCollector,
): void {
  const props = builder.getNodeProps(nodeId);
  if (!props) return;

  // ── Compound keys (badge / port) ──
  if (key.startsWith('badge ')) {
    handleBadge(key.slice(6).trim(), rawVal, lineNum, nodeId, props, diag);
    return;
  }
  if (key.startsWith('port ')) {
    handlePort(key.slice(5).trim(), rawVal, lineNum, nodeId, props, diag);
    return;
  }

  // ── Simple keys ──
  switch (key) {
    case 'position': {
      const pos = parsePosition(rawVal);
      if (pos) {
        props.position = pos;
      } else {
        diag.error(lineNum, `Invalid position "${rawVal}" on node "${nodeId}". Expected: x,y,z`);
      }
      break;
    }

    case 'glow':
      props.glow = rawVal.trim() === 'true';
      break;

    case 'label':
      props.label = coerceString(rawVal);
      break;

    case 'color':
      props.color = coerceString(rawVal);
      break;

    case 'icon':
      props.icon = rawVal.trim();
      break;

    case 'size':
      props.size = parseValue(rawVal) as VrdNodeProps['size'];
      break;

    case 'opacity':
      props.opacity = parseConstrainedNumber(rawVal, 0, 1, 'opacity', nodeId, lineNum, diag);
      break;

    case 'scale':
      props.scale = parsePositiveNumber(rawVal, 'scale', nodeId, lineNum, diag);
      break;

    case 'shape':
      props.shape = parseEnum(rawVal, VALID_SHAPES, 'shape', nodeId, lineNum, diag) as ShapeType | undefined;
      break;

    case 'status':
      props.status = parseEnum(rawVal, VALID_STATUSES, 'status', nodeId, lineNum, diag) as NodeStatus | undefined;
      break;

    case 'enter':
      props.enterAnimation = parseEnum(
        rawVal, VALID_ANIMATION_TYPES, 'enter animation', nodeId, lineNum, diag,
      ) as AnimationType | undefined;
      break;

    case 'exit':
      props.exitAnimation = parseEnum(
        rawVal, VALID_ANIMATION_TYPES, 'exit animation', nodeId, lineNum, diag,
      ) as AnimationType | undefined;
      break;

    case 'animation-duration': {
      const val = Number(rawVal);
      if (!Number.isFinite(val) || val < 0) {
        diag.warning(lineNum, `Invalid animation-duration "${rawVal}" on "${nodeId}". Expected non-negative number (ms).`);
      } else {
        props.animationDuration = val;
      }
      break;
    }

    default:
      if (!KNOWN_NODE_PROPS.has(key)) {
        diag.info(lineNum, `Unknown node property "${key}" on "${nodeId}". Stored but may not render.`);
      }
      (props as Record<string, unknown>)[key] = parseValue(rawVal);
      break;
  }
}

// ── Helpers ──

function coerceString(rawVal: string): string {
  const val = parseValue(rawVal);
  return typeof val === 'string' ? val : String(val);
}

function parseEnum(
  rawVal: string,
  validSet: ReadonlySet<string>,
  propName: string,
  nodeId: string,
  lineNum: number,
  diag: DiagnosticCollector,
): string | undefined {
  const val = rawVal.trim();
  if (!validSet.has(val)) {
    diag.warning(lineNum, `Invalid ${propName} "${val}" on node "${nodeId}". Valid: ${[...validSet].join(', ')}`);
  }
  return val;
}

function parseConstrainedNumber(
  rawVal: string,
  min: number,
  max: number,
  propName: string,
  nodeId: string,
  lineNum: number,
  diag: DiagnosticCollector,
): number | undefined {
  const val = Number(rawVal);
  if (!Number.isFinite(val) || val < min || val > max) {
    diag.warning(lineNum, `Invalid ${propName} "${rawVal}" on "${nodeId}". Expected ${min}-${max}.`);
    return undefined;
  }
  return val;
}

function parsePositiveNumber(
  rawVal: string,
  propName: string,
  nodeId: string,
  lineNum: number,
  diag: DiagnosticCollector,
): number | undefined {
  const val = Number(rawVal);
  if (!Number.isFinite(val) || val <= 0) {
    diag.warning(lineNum, `Invalid ${propName} "${rawVal}" on "${nodeId}". Expected positive number.`);
    return undefined;
  }
  return val;
}

function handleBadge(
  position: string,
  rawVal: string,
  lineNum: number,
  nodeId: string,
  props: VrdNodeProps,
  diag: DiagnosticCollector,
): void {
  if (!VALID_BADGE_POSITIONS.has(position)) {
    diag.warning(lineNum, `Invalid badge position "${position}" on "${nodeId}". Valid: ${[...VALID_BADGE_POSITIONS].join(', ')}`);
    return;
  }
  if (!props.badges) props.badges = [];
  const content = parseValue(rawVal);
  props.badges.push({
    position: position as BadgePosition,
    content: typeof content === 'string' ? content : rawVal.trim(),
  });
}

function handlePort(
  portName: string,
  rawVal: string,
  lineNum: number,
  nodeId: string,
  props: VrdNodeProps,
  diag: DiagnosticCollector,
): void {
  const side = rawVal.trim();
  if (!VALID_PORT_SIDES.has(side)) {
    diag.warning(lineNum, `Invalid port side "${side}" on "${nodeId}". Valid: ${[...VALID_PORT_SIDES].join(', ')}`);
    return;
  }
  if (!props.ports) props.ports = [];
  props.ports.push({ name: portName, side: side as PortSide });
}
