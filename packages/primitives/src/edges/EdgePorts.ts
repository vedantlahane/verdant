import * as THREE from 'three';
import type { NodePort } from '../shapes/ShapeDefinition';

/**
 * Resolves a named port on a node to its world-space position.
 * Falls back to the node's center position with a console.warn if the port is not found.
 */
export function resolvePort(
  nodeId: string,
  portName: string,
  nodeWorldPosition: THREE.Vector3,
  nodePorts: NodePort[],
): THREE.Vector3 {
  const port = nodePorts.find((p) => p.name === portName);
  if (!port) {
    console.warn(
      `[EdgePorts] Port "${portName}" not found on node "${nodeId}". Falling back to node center.`,
    );
    return nodeWorldPosition.clone();
  }
  return nodeWorldPosition.clone().add(port.localPosition);
}

/**
 * Resolves both endpoints of an edge to world-space positions.
 * Falls back to node center for any port name not found on the target node.
 */
export function resolveEdgeEndpoints(
  fromNodeId: string,
  fromPort: string | undefined,
  toNodeId: string,
  toPort: string | undefined,
  nodePositions: Map<string, THREE.Vector3>,
  nodePortsMap: Map<string, NodePort[]>,
): { from: THREE.Vector3; to: THREE.Vector3 } {
  const fromPos = nodePositions.get(fromNodeId) ?? new THREE.Vector3();
  const toPos = nodePositions.get(toNodeId) ?? new THREE.Vector3();

  const fromPorts = nodePortsMap.get(fromNodeId) ?? [];
  const toPorts = nodePortsMap.get(toNodeId) ?? [];

  const from = fromPort
    ? resolvePort(fromNodeId, fromPort, fromPos, fromPorts)
    : fromPos.clone();

  const to = toPort
    ? resolvePort(toNodeId, toPort, toPos, toPorts)
    : toPos.clone();

  return { from, to };
}
