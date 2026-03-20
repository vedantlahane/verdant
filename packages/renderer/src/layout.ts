import { VrdNode, VrdEdge, VrdGroup } from '@verdant/parser';
import {
  MIN_NODE_DISTANCE,
  FORCE_ITERATIONS,
  MIN_DISTANCE_PASSES,
  NEW_NODE_DISTANCE_PASSES,
} from './constants';
import { seededRandom, hashString, safeGroupWalk, sanitizePosition } from './utils';

export type LayoutType = 'auto' | 'grid' | 'circular';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

// ── Minimum distance enforcement ──

function enforceMinimumDistances(
  positions: Map<string, Position3D>,
  minDist: number,
  passes: number = MIN_DISTANCE_PASSES,
): void {
  const ids = Array.from(positions.keys());
  const rng = seededRandom(42); // deterministic jitter

  for (let pass = 0; pass < passes; pass++) {
    let anyMoved = false;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i])!;
        const b = positions.get(ids[j])!;

        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dz = a.z - b.z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // When two nodes occupy the exact same position,
        // direction is undefined → apply deterministic jitter
        if (dist < 0.0001) {
          dx = (rng() - 0.5) * 0.1;
          dy = (rng() - 0.5) * 0.1;
          dz = (rng() - 0.5) * 0.1;
          dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        }

        if (dist < minDist) {
          const pushFactor = (minDist - dist) / (2 * dist);
          const px = dx * pushFactor;
          const py = dy * pushFactor;
          const pz = dz * pushFactor;

          a.x += px; a.y += py; a.z += pz;
          b.x -= px; b.y -= py; b.z -= pz;
          anyMoved = true;
        }
      }
    }

    if (!anyMoved) break;
  }
}

// ── Sanitize all positions (remove NaN / Infinity) ──

function sanitizeAllPositions(positions: Map<string, Position3D>): void {
  for (const [id, pos] of positions) {
    const safe = sanitizePosition(pos.x, pos.y, pos.z);
    positions.set(id, safe);
  }
}

// ── Main entry ──

export function computeLayout(
  nodes: VrdNode[],
  edges: VrdEdge[],
  layoutType: LayoutType,
  groups: VrdGroup[] = [],
): Map<string, Position3D> {
  const positions = new Map<string, Position3D>();
  if (nodes.length === 0) return positions;

  switch (layoutType) {
    case 'grid':
      computeGridLayout(nodes, positions);
      break;
    case 'circular':
      computeCircularLayout(nodes, positions);
      break;
    case 'auto':
    default:
      computeForceDirectedLayout(nodes, edges, groups, positions);
      break;
  }

  sanitizeAllPositions(positions);
  enforceMinimumDistances(positions, MIN_NODE_DISTANCE);
  sanitizeAllPositions(positions);

  // User-defined positions always win
  for (const node of nodes) {
    if (node.props.position) {
      const p = node.props.position as Position3D;
      positions.set(node.id, sanitizePosition(p.x, p.y, p.z));
    }
  }

  return positions;
}

// ── Grid Layout ──

function computeGridLayout(
  nodes: VrdNode[],
  positions: Map<string, Position3D>,
) {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = Math.max(MIN_NODE_DISTANCE, 5);

  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const totalCols = cols;
    const totalRows = Math.ceil(nodes.length / cols);

    positions.set(node.id, {
            x: (col - (totalCols - 1) / 2) * spacing,
      y: 0,
      z: (row - (totalRows - 1) / 2) * spacing,
    });
  });
}

// ── Circular Layout ──

function computeCircularLayout(
  nodes: VrdNode[],
  positions: Map<string, Position3D>,
) {
  const count = nodes.length;
  if (count === 1) {
    positions.set(nodes[0].id, { x: 0, y: 0, z: 0 });
    return;
  }

  const circumference = count * MIN_NODE_DISTANCE;
  const radius = Math.max(circumference / (2 * Math.PI), 3);

  nodes.forEach((node, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
    });
  });
}

// ── Force-Directed Layout ──

function computeForceDirectedLayout(
  nodes: VrdNode[],
  edges: VrdEdge[],
  groups: VrdGroup[],
  positions: Map<string, Position3D>,
) {
  const n = nodes.length;
  const area = n * 30;
  const k = Math.max(Math.sqrt(area / Math.max(n, 1)), MIN_NODE_DISTANCE);
  const iterations = FORCE_ITERATIONS;

  // ── Group membership via iterative walk (no stack overflow) ──
  const nodeGroupMap = new Map<string, string>();
  safeGroupWalk(groups, (group) => {
    for (const childId of group.children) {
      nodeGroupMap.set(childId, group.id);
    }
  });

  // ── Deterministic initial positions ──
  const seedStr = nodes.map((nd) => nd.id).join(',');
  const random = seededRandom(hashString(seedStr));

  nodes.forEach((node) => {
    positions.set(node.id, {
      x: (random() - 0.5) * k * 2,
      y: (random() - 0.5) * k * 1.2,
      z: (random() - 0.5) * k * 2,
    });
  });

  // ── Pre-build edge index for O(1) lookup ──
  const edgeList: Array<{ fromIdx: number; toIdx: number }> = [];
  const idToIndex = new Map<string, number>();
  nodes.forEach((nd, i) => idToIndex.set(nd.id, i));
  for (const edge of edges) {
    const fi = idToIndex.get(edge.from);
    const ti = idToIndex.get(edge.to);
    if (fi !== undefined && ti !== undefined) {
      edgeList.push({ fromIdx: fi, toIdx: ti });
    }
  }

  // ── Pre-build group pairs (no n² scan each iteration) ──
  const groupPairs: Array<{ i: number; j: number }> = [];
  if (nodeGroupMap.size > 0) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const gI = nodeGroupMap.get(nodes[i].id);
        const gJ = nodeGroupMap.get(nodes[j].id);
        if (gI && gI === gJ) {
          groupPairs.push({ i, j });
        }
      }
    }
  }

  // ── Displacement arrays (reuse across iterations, no Map alloc) ──
  const dispX = new Float64Array(n);
  const dispY = new Float64Array(n);
  const dispZ = new Float64Array(n);

  // ── Flat position arrays for fast access ──
  const posX = new Float64Array(n);
  const posY = new Float64Array(n);
  const posZ = new Float64Array(n);

  nodes.forEach((nd, i) => {
    const p = positions.get(nd.id)!;
    posX[i] = p.x;
    posY[i] = p.y;
    posZ[i] = p.z;
  });

  for (let iter = 0; iter < iterations; iter++) {
    const temperature = ((iterations - iter) / iterations) * 3.0;

    // Reset displacements
    dispX.fill(0);
    dispY.fill(0);
    dispZ.fill(0);

    // ── Repulsive forces ──
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = posX[i] - posX[j];
        let dy = posY[i] - posY[j];
        let dz = posZ[i] - posZ[j];
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 0.0001) {
          dx = 0.01;
          dist = 0.01;
        }

        const repulse =
          (k * k) / dist +
          (dist < MIN_NODE_DISTANCE ? (MIN_NODE_DISTANCE - dist) * 5 : 0);

        const ux = (dx / dist) * repulse;
        const uy = (dy / dist) * repulse;
        const uz = (dz / dist) * repulse;

        dispX[i] += ux; dispY[i] += uy; dispZ[i] += uz;
        dispX[j] -= ux; dispY[j] -= uy; dispZ[j] -= uz;
      }
    }

    // ── Attractive forces along edges ──
    for (const { fromIdx, toIdx } of edgeList) {
      const dx = posX[fromIdx] - posX[toIdx];
      const dy = posY[fromIdx] - posY[toIdx];
      const dz = posZ[fromIdx] - posZ[toIdx];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const attract = (dist * dist) / k;

      const ux = (dx / dist) * attract;
      const uy = (dy / dist) * attract;
      const uz = (dz / dist) * attract;

      dispX[fromIdx] -= ux; dispY[fromIdx] -= uy; dispZ[fromIdx] -= uz;
      dispX[toIdx]   += ux; dispY[toIdx]   += uy; dispZ[toIdx]   += uz;
    }

    // ── Group cohesion ──
    for (const { i, j } of groupPairs) {
      const dx = posX[i] - posX[j];
      const dy = posY[i] - posY[j];
      const dz = posZ[i] - posZ[j];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const groupAttract = (dist * dist) / (k * 0.5);

      const ux = (dx / dist) * groupAttract;
      const uy = (dy / dist) * groupAttract;
      const uz = (dz / dist) * groupAttract;

      dispX[i] -= ux; dispY[i] -= uy; dispZ[i] -= uz;
      dispX[j] += ux; dispY[j] += uy; dispZ[j] += uz;
    }

    // ── Apply displacements clamped by temperature ──
    for (let i = 0; i < n; i++) {
      const dLen =
        Math.sqrt(
          dispX[i] * dispX[i] + dispY[i] * dispY[i] + dispZ[i] * dispZ[i],
        ) || 1;
      const scale = Math.min(dLen, temperature) / dLen;

      posX[i] += dispX[i] * scale;
      posY[i] += dispY[i] * scale;
      posZ[i] += dispZ[i] * scale;

      // Gentle centering gravity
      posX[i] *= 0.995;
      posY[i] *= 0.995;
      posZ[i] *= 0.995;
    }
  }

  // Write back to Map
  nodes.forEach((nd, i) => {
    positions.set(nd.id, { x: posX[i], y: posY[i], z: posZ[i] });
  });
}

// ── New nodes: stable placement near neighbors ──

export function computePositionsForNewNodes(
  newNodes: VrdNode[],
  existingPositions: Record<string, [number, number, number]>,
  edges: VrdEdge[],
): Record<string, [number, number, number]> {
  const result: Record<string, [number, number, number]> = {};

  // Pre-compute centroid once
  const allPos = Object.values(existingPositions);
  let cx = 0, cy = 0, cz = 0;
  if (allPos.length > 0) {
    for (const p of allPos) {
      cx += p[0]; cy += p[1]; cz += p[2];
    }
    cx /= allPos.length;
    cy /= allPos.length;
    cz /= allPos.length;
  }

  // Build edge index for fast neighbor lookup
  const edgeIndex = new Map<string, string>();
  for (const edge of edges) {
    if (!edgeIndex.has(edge.from)) edgeIndex.set(edge.from, edge.to);
    if (!edgeIndex.has(edge.to)) edgeIndex.set(edge.to, edge.from);
  }

  for (const node of newNodes) {
    const rng = seededRandom(hashString(node.id));
    const offsetX = (rng() - 0.5) * MIN_NODE_DISTANCE * 1.5;
    const offsetY = (rng() - 0.5) * MIN_NODE_DISTANCE * 0.8;
    const offsetZ = (rng() - 0.5) * MIN_NODE_DISTANCE * 1.5;

    // Find connected neighbor
    const neighborId = edgeIndex.get(node.id) ?? null;
    const neighborPos = neighborId
      ? existingPositions[neighborId] ?? result[neighborId]
      : null;

    if (neighborPos) {
      result[node.id] = [
        neighborPos[0] + offsetX,
        neighborPos[1] + offsetY,
        neighborPos[2] + offsetZ,
      ];
    } else if (allPos.length > 0) {
      result[node.id] = [cx + offsetX * 2, cy + offsetY, cz + offsetZ * 2];
    } else {
      result[node.id] = [offsetX * 2, offsetY, offsetZ * 2];
    }

    // Sanitize
    const r = result[node.id];
    if (!Number.isFinite(r[0]) || !Number.isFinite(r[1]) || !Number.isFinite(r[2])) {
      result[node.id] = [0, 0, 0];
    }
  }

  // Enforce minimum distances among all nodes
  const allPositions = new Map<string, Position3D>();
  for (const [id, pos] of Object.entries(existingPositions)) {
    allPositions.set(id, { x: pos[0], y: pos[1], z: pos[2] });
  }
  for (const [id, pos] of Object.entries(result)) {
    allPositions.set(id, { x: pos[0], y: pos[1], z: pos[2] });
  }

  enforceMinimumDistances(allPositions, MIN_NODE_DISTANCE, NEW_NODE_DISTANCE_PASSES);

  for (const node of newNodes) {
    const corrected = allPositions.get(node.id)!;
    result[node.id] = [corrected.x, corrected.y, corrected.z];
  }

  return result;
}