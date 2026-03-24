// layout.ts

import type { VrdNode, VrdEdge, VrdGroup } from '@verdant/parser';
import { HierarchicalLayout } from '@verdant/primitives/src/layout/HierarchicalLayout';
import type { Vec3, MutVec3 } from './types';
import {
  MIN_NODE_DISTANCE,
  FORCE_ITERATIONS,
  MIN_DISTANCE_PASSES,
  NEW_NODE_DISTANCE_PASSES,
  FORCE_INITIAL_TEMPERATURE,
  FORCE_CENTERING_GRAVITY,
  FORCE_Y_SPREAD_RATIO,
  FORCE_GROUP_COHESION_DIVISOR,
  FORCE_OVERLAP_PENALTY,
} from './constants';
import { seededRandom, hashString, safeGroupWalk, sanitizeVec3, isFiniteVec3 } from './utils';

// ═══════════════════════════════════════════════════════════════════
//  Public Types
// ═══════════════════════════════════════════════════════════════════

export type LayoutType = 'auto' | 'grid' | 'circular' | 'hierarchical' | 'forced';

export type LayoutDirection = 'TB' | 'LR';

// ═══════════════════════════════════════════════════════════════════
//  Internal Flat Position Buffer
//
//  The force-directed layout operates on flat Float64Arrays for
//  cache-friendly iteration. This type wraps the three arrays plus
//  the ID-to-index mapping used to convert between the flat
//  representation and the Map<string, MutVec3> output.
// ═══════════════════════════════════════════════════════════════════

interface PositionBuffer {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly idToIndex: ReadonlyMap<string, number>;
  readonly indexToId: readonly string[];
  readonly length: number;
}

function createPositionBuffer(nodes: readonly VrdNode[]): PositionBuffer {
  const n = nodes.length;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  const idToIndex = new Map<string, number>();
  const indexToId: string[] = new Array(n);

  for (let i = 0; i < n; i++) {
    idToIndex.set(nodes[i].id, i);
    indexToId[i] = nodes[i].id;
  }

  return { x, y, z, idToIndex, indexToId, length: n };
}

function bufferToMap(buf: PositionBuffer): Map<string, MutVec3> {
  const result = new Map<string, MutVec3>();
  for (let i = 0; i < buf.length; i++) {
    result.set(buf.indexToId[i], [buf.x[i], buf.y[i], buf.z[i]]);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════
//  Minimum Distance Enforcement
// ═══════════════════════════════════════════════════════════════════

/**
 * Iterative separation pass on flat buffers.
 *
 * When two nodes are closer than `minDist`, they are pushed apart
 * symmetrically along their connecting vector. A deterministic
 * jitter is applied when nodes overlap exactly (distance ≈ 0)
 * to break symmetry.
 *
 * Returns early if a full pass produces no movement (stable).
 */
function enforceMinimumDistances(
  buf: PositionBuffer,
  minDist: number,
  passes: number = MIN_DISTANCE_PASSES,
): void {
  const { x, y, z, length: n } = buf;
  const rng = seededRandom(42);
  const minDistSq = minDist * minDist;

  for (let pass = 0; pass < passes; pass++) {
    let anyMoved = false;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = x[i] - x[j];
        let dy = y[i] - y[j];
        let dz = z[i] - z[j];
        let distSq = dx * dx + dy * dy + dz * dz;

        // Skip early — most pairs will be far enough apart
        if (distSq >= minDistSq) continue;

        // Exact overlap → deterministic jitter to break symmetry
        if (distSq < 0.00000001) {
          dx = (rng() - 0.5) * 0.1;
          dy = (rng() - 0.5) * 0.1;
          dz = (rng() - 0.5) * 0.1;
          distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < 0.00000001) distSq = 0.000001;
        }

        const dist = Math.sqrt(distSq);
        const pushFactor = (minDist - dist) / (2 * dist);
        const px = dx * pushFactor;
        const py = dy * pushFactor;
        const pz = dz * pushFactor;

        x[i] += px; y[i] += py; z[i] += pz;
        x[j] -= px; y[j] -= py; z[j] -= pz;
        anyMoved = true;
      }
    }

    if (!anyMoved) break;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Position Sanitization (NaN / Infinity → 0)
// ═══════════════════════════════════════════════════════════════════

function sanitizeBuffer(buf: PositionBuffer): void {
  const { x, y, z, length: n } = buf;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(x[i])) x[i] = 0;
    if (!Number.isFinite(y[i])) y[i] = 0;
    if (!Number.isFinite(z[i])) z[i] = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Grid Layout
// ═══════════════════════════════════════════════════════════════════

function computeGridLayout(
  nodes: readonly VrdNode[],
  buf: PositionBuffer,
): void {
  const n = nodes.length;
  if (n === 0) return;

  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const spacing = Math.max(MIN_NODE_DISTANCE, 5);

  // Center offsets so the grid is symmetric about the origin
  const offsetX = ((cols - 1) * spacing) / 2;
  const offsetZ = ((rows - 1) * spacing) / 2;

  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = (i / cols) | 0;
    buf.x[i] = col * spacing - offsetX;
    buf.y[i] = 0;
    buf.z[i] = row * spacing - offsetZ;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Circular Layout
// ═══════════════════════════════════════════════════════════════════

function computeCircularLayout(
  nodes: readonly VrdNode[],
  buf: PositionBuffer,
): void {
  const n = nodes.length;
  if (n === 0) return;

  if (n === 1) {
    buf.x[0] = 0;
    buf.y[0] = 0;
    buf.z[0] = 0;
    return;
  }

  const circumference = n * MIN_NODE_DISTANCE;
  const radius = Math.max(circumference / (2 * Math.PI), 3);
  const angleStep = (Math.PI * 2) / n;
  const angleOffset = -Math.PI / 2;

  for (let i = 0; i < n; i++) {
    const angle = i * angleStep + angleOffset;
    buf.x[i] = Math.cos(angle) * radius;
    buf.y[i] = 0;
    buf.z[i] = Math.sin(angle) * radius;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Hierarchical Layout (delegates to @verdant/primitives)
// ═══════════════════════════════════════════════════════════════════

function computeHierarchicalLayout(
  nodes: readonly VrdNode[],
  edges: readonly VrdEdge[],
  direction: LayoutDirection,
  buf: PositionBuffer,
): void {
  const layout = new HierarchicalLayout({ nodeSpacing: 4, layerSpacing: 4 });
  const result = layout.compute(
    nodes.map((n) => ({ id: n.id })),
    edges.map((e) => ({ from: e.from, to: e.to })),
  );

  const isLR = direction === 'LR';

  for (const [id, vec] of result.positions) {
    const idx = buf.idToIndex.get(id);
    if (idx === undefined) continue;

    if (isLR) {
      // Rotate 90°: x-axis → depth (z), y-axis → horizontal (x)
      buf.x[idx] = -vec.y;
      buf.y[idx] = 0;
      buf.z[idx] = vec.x;
    } else {
      // TB (default): x stays x, y (layer depth) maps to z
      buf.x[idx] = vec.x;
      buf.y[idx] = 0;
      buf.z[idx] = -vec.y;
    }
  }

  // Place any nodes not covered by the layout at origin
  for (let i = 0; i < buf.length; i++) {
    if (!result.positions.has(buf.indexToId[i])) {
      buf.x[i] = 0;
      buf.y[i] = 0;
      buf.z[i] = 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Force-Directed Layout (Fruchterman–Reingold variant)
//
//  Performance considerations:
//  - Flat Float64Array storage (cache-friendly sequential access)
//  - Pre-built edge index (avoids Map lookups during iteration)
//  - Pre-built group-pair list (avoids re-scanning each iteration)
//  - Reusable displacement arrays (zero allocation per iteration)
//  - Early `distSq` comparison in minimum-distance check
//
//  Future optimization: Barnes-Hut / quadtree spatial partitioning
//  for O(n log n) repulsion. Current O(n²) is acceptable up to
//  ~500 nodes at 150 iterations ≈ 37.5M distance calculations.
// ═══════════════════════════════════════════════════════════════════

interface EdgePair {
  readonly fromIdx: number;
  readonly toIdx: number;
}

interface GroupPair {
  readonly i: number;
  readonly j: number;
}

/**
 * Pre-compute edge pairs as flat index tuples.
 * Skips edges that reference nodes not in the current layout.
 */
function buildEdgePairs(
  edges: readonly VrdEdge[],
  idToIndex: ReadonlyMap<string, number>,
): EdgePair[] {
  const pairs: EdgePair[] = [];
  for (const edge of edges) {
    const fi = idToIndex.get(edge.from);
    const ti = idToIndex.get(edge.to);
    if (fi !== undefined && ti !== undefined) {
      pairs.push({ fromIdx: fi, toIdx: ti });
    }
  }
  return pairs;
}

/**
 * Pre-compute group-sibling pairs.
 * Two nodes in the same group receive extra cohesion force.
 */
function buildGroupPairs(
  nodes: readonly VrdNode[],
  groups: readonly VrdGroup[],
  idToIndex: ReadonlyMap<string, number>,
): GroupPair[] {
  if (groups.length === 0) return [];

  // Build node → group membership via iterative walk
  const nodeGroupMap = new Map<string, string>();
  safeGroupWalk(groups, (group) => {
    for (const childId of group.children) {
      nodeGroupMap.set(childId, group.id);
    }
  });

  if (nodeGroupMap.size === 0) return [];

  // Bucket nodes by group
  const groupBuckets = new Map<string, number[]>();
  for (const node of nodes) {
    const groupId = nodeGroupMap.get(node.id);
    if (!groupId) continue;
    const idx = idToIndex.get(node.id);
    if (idx === undefined) continue;

    let bucket = groupBuckets.get(groupId);
    if (!bucket) {
      bucket = [];
      groupBuckets.set(groupId, bucket);
    }
    bucket.push(idx);
  }

  // Generate pairs within each bucket
  const pairs: GroupPair[] = [];
  for (const bucket of groupBuckets.values()) {
    for (let a = 0; a < bucket.length; a++) {
      for (let b = a + 1; b < bucket.length; b++) {
        pairs.push({ i: bucket[a], j: bucket[b] });
      }
    }
  }

  return pairs;
}

function computeForceDirectedLayout(
  nodes: readonly VrdNode[],
  edges: readonly VrdEdge[],
  groups: readonly VrdGroup[],
  buf: PositionBuffer,
): void {
  const n = buf.length;
  if (n === 0) return;

  const area = n * 30;
  const k = Math.max(Math.sqrt(area / Math.max(n, 1)), MIN_NODE_DISTANCE);
  const kSq = k * k;
  const minDistSq = MIN_NODE_DISTANCE * MIN_NODE_DISTANCE;
  const groupK = k * FORCE_GROUP_COHESION_DIVISOR;

  const edgePairs = buildEdgePairs(edges, buf.idToIndex);
  const groupPairs = buildGroupPairs(nodes, groups, buf.idToIndex);

  // ── Deterministic initial positions ──
  const seedStr = nodes.map((nd) => nd.id).join(',');
  const random = seededRandom(hashString(seedStr));

  const { x, y, z } = buf;
  for (let i = 0; i < n; i++) {
    x[i] = (random() - 0.5) * k * 2;
    y[i] = (random() - 0.5) * k * FORCE_Y_SPREAD_RATIO;
    z[i] = (random() - 0.5) * k * 2;
  }

  // ── Reusable displacement arrays ──
  const dispX = new Float64Array(n);
  const dispY = new Float64Array(n);
  const dispZ = new Float64Array(n);

  for (let iter = 0; iter < FORCE_ITERATIONS; iter++) {
    const temperature =
      ((FORCE_ITERATIONS - iter) / FORCE_ITERATIONS) * FORCE_INITIAL_TEMPERATURE;

    // Reset displacements
    dispX.fill(0);
    dispY.fill(0);
    dispZ.fill(0);

    // ── Repulsive forces (O(n²) — see header comment for future work) ──
    for (let i = 0; i < n; i++) {
      const xi = x[i], yi = y[i], zi = z[i];

      for (let j = i + 1; j < n; j++) {
        let dx = xi - x[j];
        let dy = yi - y[j];
        let dz = zi - z[j];
        let distSq = dx * dx + dy * dy + dz * dz;

        // Exact overlap → small jitter
        if (distSq < 0.00000001) {
          dx = 0.01;
          distSq = 0.0001;
        }

        const dist = Math.sqrt(distSq);

        // Coulomb-like repulsion + hard overlap penalty
        const repulse =
          kSq / dist +
          (distSq < minDistSq
            ? (MIN_NODE_DISTANCE - dist) * FORCE_OVERLAP_PENALTY
            : 0);

        const fx = (dx / dist) * repulse;
        const fy = (dy / dist) * repulse;
        const fz = (dz / dist) * repulse;

        dispX[i] += fx; dispY[i] += fy; dispZ[i] += fz;
        dispX[j] -= fx; dispY[j] -= fy; dispZ[j] -= fz;
      }
    }

    // ── Attractive forces along edges ──
    for (let e = 0; e < edgePairs.length; e++) {
      const { fromIdx, toIdx } = edgePairs[e];
      const dx = x[fromIdx] - x[toIdx];
      const dy = y[fromIdx] - y[toIdx];
      const dz = z[fromIdx] - z[toIdx];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const attract = (dist * dist) / k;

      const fx = (dx / dist) * attract;
      const fy = (dy / dist) * attract;
      const fz = (dz / dist) * attract;

      dispX[fromIdx] -= fx; dispY[fromIdx] -= fy; dispZ[fromIdx] -= fz;
      dispX[toIdx]   += fx; dispY[toIdx]   += fy; dispZ[toIdx]   += fz;
    }

    // ── Group cohesion ──
    for (let g = 0; g < groupPairs.length; g++) {
      const { i, j } = groupPairs[g];
      const dx = x[i] - x[j];
      const dy = y[i] - y[j];
      const dz = z[i] - z[j];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const groupAttract = (dist * dist) / groupK;

      const fx = (dx / dist) * groupAttract;
      const fy = (dy / dist) * groupAttract;
      const fz = (dz / dist) * groupAttract;

      dispX[i] -= fx; dispY[i] -= fy; dispZ[i] -= fz;
      dispX[j] += fx; dispY[j] += fy; dispZ[j] += fz;
    }

    // ── Apply displacements clamped by temperature ──
    for (let i = 0; i < n; i++) {
      const dLen =
        Math.sqrt(
          dispX[i] * dispX[i] + dispY[i] * dispY[i] + dispZ[i] * dispZ[i],
        ) || 1;
      const scale = Math.min(dLen, temperature) / dLen;

      x[i] += dispX[i] * scale;
      y[i] += dispY[i] * scale;
      z[i] += dispZ[i] * scale;

      // Gentle centering gravity
      x[i] *= FORCE_CENTERING_GRAVITY;
      y[i] *= FORCE_CENTERING_GRAVITY;
      z[i] *= FORCE_CENTERING_GRAVITY;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  User-Defined Position Override
// ═══════════════════════════════════════════════════════════════════

/**
 * Apply explicit `position` props from VrdNodes.
 * These always override computed layout positions.
 */
function applyUserPositions(
  nodes: readonly VrdNode[],
  buf: PositionBuffer,
): void {
  for (const node of nodes) {
    if (!node.props.position) continue;
    const p = node.props.position as { x: number; y: number; z: number };
    const idx = buf.idToIndex.get(node.id);
    if (idx === undefined) continue;

    const safe = sanitizeVec3(p.x, p.y, p.z);
    buf.x[idx] = safe[0];
    buf.y[idx] = safe[1];
    buf.z[idx] = safe[2];
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Full Layout
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute positions for all nodes using the specified layout algorithm.
 *
 * Pipeline:
 *  1. Run layout algorithm → fill position buffer
 *  2. Sanitize (NaN/Infinity → 0)
 *  3. Enforce minimum distances
 *  4. Sanitize again (push-apart can produce NaN in degenerate cases)
 *  5. Apply user-defined positions (always win)
 *
 * Returns a Map<nodeId, MutVec3>.
 */
export function computeLayout(
  nodes: readonly VrdNode[],
  edges: readonly VrdEdge[],
  layoutType: LayoutType,
  groups: readonly VrdGroup[] = [],
  direction: LayoutDirection = 'TB',
): Map<string, MutVec3> {
  if (nodes.length === 0) return new Map();

  const buf = createPositionBuffer(nodes);

  switch (layoutType) {
    case 'grid':
      computeGridLayout(nodes, buf);
      break;
    case 'circular':
      computeCircularLayout(nodes, buf);
      break;
    case 'hierarchical':
      computeHierarchicalLayout(nodes, edges, direction, buf);
      break;
    case 'forced':
    case 'auto':
    default:
      computeForceDirectedLayout(nodes, edges, groups, buf);
      break;
  }

  // Post-processing pipeline
  sanitizeBuffer(buf);
  enforceMinimumDistances(buf, MIN_NODE_DISTANCE);
  sanitizeBuffer(buf);
  applyUserPositions(nodes, buf);

  return bufferToMap(buf);
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Incremental New-Node Placement
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute stable positions for newly added nodes relative to
 * existing layout.
 *
 * Strategy:
 * - If a new node has an existing connected neighbor (via edges),
 *   place it near that neighbor with deterministic offset.
 * - Otherwise, place it near the centroid of all existing nodes.
 * - Enforce minimum distances among ALL nodes (existing + new)
 *   to prevent overlaps.
 *
 * Bug fix from original: The edge neighbor index now stores ALL
 * neighbors (not just one per node), so a new node connected to
 * multiple existing nodes gets placed near any of them rather
 * than being silently dropped when its edge is overwritten.
 */
export function computePositionsForNewNodes(
  newNodes: readonly VrdNode[],
  existingPositions: Readonly<Record<string, Vec3>>,
  edges: readonly VrdEdge[],
): Record<string, MutVec3> {
  const result: Record<string, MutVec3> = {};
  if (newNodes.length === 0) return result;

  // Pre-compute centroid of existing nodes
  const allPos = Object.values(existingPositions);
  let cx = 0, cy = 0, cz = 0;
  if (allPos.length > 0) {
    for (const p of allPos) {
      cx += p[0]; cy += p[1]; cz += p[2];
    }
    const invLen = 1 / allPos.length;
    cx *= invLen;
    cy *= invLen;
    cz *= invLen;
  }

  // Build adjacency: node → set of connected node IDs
  // Fix: original used Map<string, string> which overwrites —
  // a node connected to 3 others would only remember the last one
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    let fromSet = adjacency.get(edge.from);
    if (!fromSet) {
      fromSet = new Set();
      adjacency.set(edge.from, fromSet);
    }
    fromSet.add(edge.to);

    let toSet = adjacency.get(edge.to);
    if (!toSet) {
      toSet = new Set();
      adjacency.set(edge.to, toSet);
    }
    toSet.add(edge.from);
  }

  // Place new nodes
  const newNodeIds = new Set(newNodes.map((n) => n.id));

  for (const node of newNodes) {
    const rng = seededRandom(hashString(node.id));
    const offsetX = (rng() - 0.5) * MIN_NODE_DISTANCE * 1.5;
    const offsetY = (rng() - 0.5) * MIN_NODE_DISTANCE * 0.8;
    const offsetZ = (rng() - 0.5) * MIN_NODE_DISTANCE * 1.5;

    // Find the first connected neighbor that already has a position
    let neighborPos: Vec3 | MutVec3 | null = null;
    const neighbors = adjacency.get(node.id);
    if (neighbors) {
      for (const nId of neighbors) {
        // Check existing positions first, then already-placed new nodes
        const pos = existingPositions[nId] ?? result[nId];
        if (pos) {
          neighborPos = pos;
          break;
        }
      }
    }

    if (neighborPos) {
      result[node.id] = [
        neighborPos[0] + offsetX,
        neighborPos[1] + offsetY,
        neighborPos[2] + offsetZ,
      ];
    } else if (allPos.length > 0) {
      result[node.id] = [
        cx + offsetX * 2,
        cy + offsetY,
        cz + offsetZ * 2,
      ];
    } else {
      result[node.id] = [
        offsetX * 2,
        offsetY,
        offsetZ * 2,
      ];
    }

    // Sanitize
    if (!isFiniteVec3(result[node.id])) {
      result[node.id] = [0, 0, 0];
    }
  }

  // Enforce minimum distances among ALL nodes
  const allNodeIds: string[] = [];

  // We need a buffer covering both existing + new for enforcement
  for (const id of Object.keys(existingPositions)) {
    allNodeIds.push(id);
  }
  for (const node of newNodes) {
    allNodeIds.push(node.id);
  }

  const buf = {
    x: new Float64Array(allNodeIds.length),
    y: new Float64Array(allNodeIds.length),
    z: new Float64Array(allNodeIds.length),
    idToIndex: new Map<string, number>(),
    indexToId: allNodeIds,
    length: allNodeIds.length,
  };

  for (let i = 0; i < allNodeIds.length; i++) {
    const id = allNodeIds[i];
    buf.idToIndex.set(id, i);
    const pos = existingPositions[id] ?? result[id] ?? [0, 0, 0];
    buf.x[i] = pos[0];
    buf.y[i] = pos[1];
    buf.z[i] = pos[2];
  }

  enforceMinimumDistances(buf, MIN_NODE_DISTANCE, NEW_NODE_DISTANCE_PASSES);

  // Write back only new node positions
  for (const node of newNodes) {
    const idx = buf.idToIndex.get(node.id)!;
    result[node.id] = [buf.x[idx], buf.y[idx], buf.z[idx]];
  }

  return result;
}