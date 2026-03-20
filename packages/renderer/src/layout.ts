import { VrdNode, VrdEdge, VrdGroup } from '@verdant/parser';

export type LayoutType = 'auto' | 'grid' | 'circular';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

// ============================================
// Constants
// ============================================

/** Minimum world-unit distance between any two nodes */
const MIN_NODE_DISTANCE = 4.5;

// ============================================
// Deterministic seeded random
// ============================================

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ============================================
// Minimum distance enforcement pass
// ============================================

function enforceMinimumDistances(
  positions: Map<string, Position3D>,
  minDist: number,
  passes = 10,
): void {
  const ids = Array.from(positions.keys());

  for (let pass = 0; pass < passes; pass++) {
    let anyMoved = false;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i])!;
        const b = positions.get(ids[j])!;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

        if (dist < minDist) {
          // Push apart symmetrically
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

    if (!anyMoved) break; // Converged early
  }
}

// ============================================
// Main entry
// ============================================

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

  // Enforce minimum spacing after layout
  enforceMinimumDistances(positions, MIN_NODE_DISTANCE);

  // User-defined positions always win
  for (const node of nodes) {
    if (node.props.position) {
      const p = node.props.position as Position3D;
      positions.set(node.id, { x: p.x, y: p.y, z: p.z });
    }
  }

  return positions;
}

// ============================================
// Grid Layout — 3D: rows on X, columns on Z
// ============================================

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

// ============================================
// Circular Layout — flat on XZ plane
// ============================================

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

// ============================================
// Force-Directed Layout — full 3D (X, Y, Z)
// ============================================

function computeForceDirectedLayout(
  nodes: VrdNode[],
  edges: VrdEdge[],
  groups: VrdGroup[],
  positions: Map<string, Position3D>,
) {
  const n = nodes.length;
  // Area scales with node count; k is the ideal edge length
  const area = n * 30;
  const k = Math.max(Math.sqrt(area / Math.max(n, 1)), MIN_NODE_DISTANCE);
  const iterations = 150;

  // ── Group membership map ──
  const nodeGroupMap = new Map<string, string>();
  function walkGroups(list: VrdGroup[]) {
    for (const g of list) {
      for (const childId of g.children) nodeGroupMap.set(childId, g.id);
      if (g.groups.length > 0) walkGroups(g.groups);
    }
  }
  walkGroups(groups);

  // ── Deterministic 3D initial positions ──
  const seedStr = nodes.map((n) => n.id).join(',');
  const random = seededRandom(hashString(seedStr));

  nodes.forEach((node) => {
    // Spread across all 3 axes initially
    positions.set(node.id, {
      x: (random() - 0.5) * k * 2,
      y: (random() - 0.5) * k * 1.2, // Y spread is a bit smaller
      z: (random() - 0.5) * k * 2,
    });
  });

  const dist3 = (a: Position3D, b: Position3D) => {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
  };

  for (let iter = 0; iter < iterations; iter++) {
    // Temperature cools from 3.0 → 0
    const temperature = ((iterations - iter) / iterations) * 3.0;

    const disp = new Map<string, Position3D>();
    nodes.forEach((n) => disp.set(n.id, { x: 0, y: 0, z: 0 }));

    // ── Repulsive forces ──
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const vi = nodes[i].id, vj = nodes[j].id;
        const pi = positions.get(vi)!;
        const pj = positions.get(vj)!;

        const d = dist3(pi, pj);
        // Stronger repulsion at close range to enforce MIN_NODE_DISTANCE
        const repulse = (k * k) / d + (d < MIN_NODE_DISTANCE ? (MIN_NODE_DISTANCE - d) * 5 : 0);

        const dx = (pi.x - pj.x) / d;
        const dy = (pi.y - pj.y) / d;
        const dz = (pi.z - pj.z) / d;

        const di = disp.get(vi)!;
        const dj = disp.get(vj)!;
        di.x += dx * repulse; di.y += dy * repulse; di.z += dz * repulse;
        dj.x -= dx * repulse; dj.y -= dy * repulse; dj.z -= dz * repulse;
      }
    }

    // ── Attractive forces along edges ──
    for (const edge of edges) {
      const pf = positions.get(edge.from);
      const pt = positions.get(edge.to);
      if (!pf || !pt) continue;

      const d = dist3(pf, pt);
      const attract = (d * d) / k;

      const dx = (pf.x - pt.x) / d;
      const dy = (pf.y - pt.y) / d;
      const dz = (pf.z - pt.z) / d;

      const df = disp.get(edge.from)!;
      const dt = disp.get(edge.to)!;
      df.x -= dx * attract; df.y -= dy * attract; df.z -= dz * attract;
      dt.x += dx * attract; dt.y += dy * attract; dt.z += dz * attract;
    }

    // ── Group cohesion ──
    if (nodeGroupMap.size > 0) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const gI = nodeGroupMap.get(nodes[i].id);
          const gJ = nodeGroupMap.get(nodes[j].id);
          if (!gI || gI !== gJ) continue;

          const pi = positions.get(nodes[i].id)!;
          const pj = positions.get(nodes[j].id)!;
          const d = dist3(pi, pj);
          const groupAttract = (d * d) / (k * 0.5);

          const dx = (pi.x - pj.x) / d;
          const dy = (pi.y - pj.y) / d;
          const dz = (pi.z - pj.z) / d;

          const di = disp.get(nodes[i].id)!;
          const dj = disp.get(nodes[j].id)!;
          di.x -= dx * groupAttract; di.y -= dy * groupAttract; di.z -= dz * groupAttract;
          dj.x += dx * groupAttract; dj.y += dy * groupAttract; dj.z += dz * groupAttract;
        }
      }
    }

    // ── Apply displacements clamped by temperature ──
    for (const node of nodes) {
      const pos = positions.get(node.id)!;
      const d = disp.get(node.id)!;
      const dLen = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z) || 1;
      const scale = Math.min(dLen, temperature) / dLen;

      pos.x += d.x * scale;
      pos.y += d.y * scale;
      pos.z += d.z * scale;

      // Gentle centering gravity
      pos.x *= 0.995;
      pos.y *= 0.995;
      pos.z *= 0.995;
    }
  }
}

// ============================================
// New nodes — stable placement near neighbors
// Uses deterministic offset based on node id hash
// so repeated typing doesn't randomize position
// ============================================

export function computePositionsForNewNodes(
  newNodes: VrdNode[],
  existingPositions: Record<string, [number, number, number]>,
  edges: VrdEdge[],
): Record<string, [number, number, number]> {
  const result: Record<string, [number, number, number]> = {};

  for (const node of newNodes) {
    // Deterministic offset so typing doesn't re-randomize
    const rng = seededRandom(hashString(node.id));
    const offsetX = (rng() - 0.5) * MIN_NODE_DISTANCE * 1.5;
    const offsetY = (rng() - 0.5) * MIN_NODE_DISTANCE * 0.8;
    const offsetZ = (rng() - 0.5) * MIN_NODE_DISTANCE * 1.5;

    // Find a connected neighbor that's already placed
    const connectedEdge = edges.find(
      (e) => e.from === node.id || e.to === node.id,
    );
    const neighborId = connectedEdge
      ? connectedEdge.from === node.id
        ? connectedEdge.to
        : connectedEdge.from
      : null;

    const neighborPos = neighborId ? existingPositions[neighborId] : null;

    if (neighborPos) {
      result[node.id] = [
        neighborPos[0] + offsetX,
        neighborPos[1] + offsetY,
        neighborPos[2] + offsetZ,
      ];
    } else {
      // Centroid of existing nodes + deterministic offset
      const allPos = Object.values(existingPositions);
      if (allPos.length > 0) {
        const cx = allPos.reduce((s, p) => s + p[0], 0) / allPos.length;
        const cy = allPos.reduce((s, p) => s + p[1], 0) / allPos.length;
        const cz = allPos.reduce((s, p) => s + p[2], 0) / allPos.length;
        result[node.id] = [cx + offsetX * 2, cy + offsetY, cz + offsetZ * 2];
      } else {
        result[node.id] = [offsetX * 2, offsetY, offsetZ * 2];
      }
    }
  }

  // After placing new nodes, enforce minimum distances among all
  const allPositions = new Map<string, Position3D>();
  for (const [id, pos] of Object.entries(existingPositions)) {
    allPositions.set(id, { x: pos[0], y: pos[1], z: pos[2] });
  }
  for (const [id, pos] of Object.entries(result)) {
    allPositions.set(id, { x: pos[0], y: pos[1], z: pos[2] });
  }

  enforceMinimumDistances(allPositions, MIN_NODE_DISTANCE, 20);

  // Write corrected positions back to result only for new nodes
  for (const node of newNodes) {
    const corrected = allPositions.get(node.id)!;
    result[node.id] = [corrected.x, corrected.y, corrected.z];
  }

  return result;
}