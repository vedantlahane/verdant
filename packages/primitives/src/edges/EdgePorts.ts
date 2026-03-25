// primitives/src/edges/EdgePorts.ts

import { Vector3 } from 'three';
import type { NodePort } from '../shapes/ShapeDefinition';

const _tempVec = new Vector3();

/**
 * Resolves a named port on a node to its world-space position.
 *
 * @returns World position of the port, or node center if port not found.
 */
export function resolvePort(
  nodeId: string,
  portName: string,
  nodeWorldPosition: Vector3,
  nodePorts: NodePort[],
  out?: Vector3,
): Vector3 {
  const result = out ?? new Vector3();

  const port = nodePorts.find((p) => p.name === portName);
  if (!port) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[EdgePorts] Port "${portName}" not found on node "${nodeId}". ` +
        `Available ports: [${nodePorts.map((p) => p.name).join(', ')}]. ` +
        'Falling back to node center.',
      );
    }
    return result.copy(nodeWorldPosition);
  }

  return result.copy(nodeWorldPosition).add(port.localPosition);
}

/**
 * Resolves both endpoints of an edge to world-space positions.
 *
 * Falls back to node center for:
 * - Port name not found on the target node
 * - Node ID not found in position map (warns in dev)
 *
 * @returns `{ from, to }` as world-space Vector3s. Caller owns these instances.
 */
export function resolveEdgeEndpoints(
  fromNodeId: string,
  fromPort: string | undefined,
  toNodeId: string,
  toPort: string | undefined,
  nodePositions: Map<string, Vector3>,
  nodePortsMap: Map<string, NodePort[]>,
): { from: Vector3; to: Vector3 } {
  // Resolve node positions
  let fromPos = nodePositions.get(fromNodeId);
  if (!fromPos) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[EdgePorts] Node "${fromNodeId}" not found in position map. Using origin.`);
    }
    fromPos = _tempVec.set(0, 0, 0);
  }

  let toPos = nodePositions.get(toNodeId);
  if (!toPos) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[EdgePorts] Node "${toNodeId}" not found in position map. Using origin.`);
    }
    toPos = _tempVec.set(0, 0, 0);
  }

  // Resolve ports
  const fromPorts = nodePortsMap.get(fromNodeId) ?? [];
  const toPorts = nodePortsMap.get(toNodeId) ?? [];

  const fromResult = fromPort
    ? resolvePort(fromNodeId, fromPort, fromPos, fromPorts, new Vector3())
    : new Vector3().copy(fromPos);

  const toResult = toPort
    ? resolvePort(toNodeId, toPort, toPos, toPorts, new Vector3())
    : new Vector3().copy(toPos);

  return { from: fromResult, to: toResult };
}