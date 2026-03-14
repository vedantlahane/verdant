import { VrdNode, VrdEdge, VrdGroup } from '@repo/parser';

export type LayoutType = 'auto' | 'grid' | 'circular';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

// ============================================
// Deterministic seeded random (for consistent layouts)
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
// Main entry
// ============================================

export function computeLayout(
  nodes: VrdNode[],
  edges: VrdEdge[],
  layoutType: LayoutType,
  groups: VrdGroup[] = []
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

  // Override with user-defined positions
  for (const node of nodes) {
    if (node.props.position) {
      const p = node.props.position;
      positions.set(node.id, { x: p.x, y: p.y, z: p.z });
    }
  }

  return positions;
}

// ============================================
// Grid Layout
// ============================================

function computeGridLayout(
  nodes: VrdNode[],
  positions: Map<string, Position3D>
) {
  const columns = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 4;

  nodes.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const totalRows = Math.ceil(nodes.length / columns);

    const x = (col - (columns - 1) / 2) * spacing;
    const y = ((totalRows - 1) / 2 - row) * spacing; // Top to bottom
    positions.set(node.id, { x, y, z: 0 });
  });
}

// ============================================
// Circular Layout
// ============================================

function computeCircularLayout(
  nodes: VrdNode[],
  positions: Map<string, Position3D>
) {
  const count = nodes.length;
  if (count === 1) {
    positions.set(nodes[0].id, { x: 0, y: 0, z: 0 });
    return;
  }

  const spacing = 3;
  const radius = Math.max((spacing * count) / (2 * Math.PI), 3);

  nodes.forEach((node, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2; // Start from top
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: 0,
    });
  });
}

// ============================================
// Force-Directed Layout (Fruchterman-Reingold)
// ============================================

function computeForceDirectedLayout(
  nodes: VrdNode[],
  edges: VrdEdge[],
  groups: VrdGroup[],
  positions: Map<string, Position3D>
) {
  const area = nodes.length * 25;
  const k = Math.sqrt(area / Math.max(nodes.length, 1));
  const iterations = 120;

  // Build group membership lookup: nodeId → groupId
  const nodeGroupMap = new Map<string, string>();
  function walkGroups(groupList: VrdGroup[]) {
    for (const g of groupList) {
      for (const childId of g.children) {
        nodeGroupMap.set(childId, g.id);
      }
      if (g.groups.length > 0) walkGroups(g.groups);
    }
  }
  walkGroups(groups);

  // Deterministic seed based on node IDs (same input → same layout)
  const seedStr = nodes.map(n => n.id).join(',');
  const random = seededRandom(hashString(seedStr));

  // Initialize positions deterministically
  nodes.forEach((node) => {
    positions.set(node.id, {
      x: (random() - 0.5) * 6,
      y: (random() - 0.5) * 6,
      z: 0, // Keep z=0 for cleaner default view; use y for vertical
    });
  });

  // Build adjacency set for quick lookups
  const edgeSet = new Set<string>();
  edges.forEach(e => {
    edgeSet.add(`${e.from}|${e.to}`);
    edgeSet.add(`${e.to}|${e.from}`);
  });

  const getDistance = (p1: Position3D, p2: Position3D) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
  };

  for (let iter = 0; iter < iterations; iter++) {
    const temperature = ((iterations - iter) / iterations) * 2.5;

    const displacements = new Map<string, Position3D>();
    nodes.forEach((n) =>
      displacements.set(n.id, { x: 0, y: 0, z: 0 })
    );

    // Repulsive forces between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const v = nodes[i].id;
        const u = nodes[j].id;
        const posV = positions.get(v)!;
        const posU = positions.get(u)!;

        const dx = posV.x - posU.x;
        const dy = posV.y - posU.y;
        const dz = posV.z - posU.z;
        const dist = getDistance(posV, posU);

        const repulseForce = (k * k) / dist;
        const fx = (dx / dist) * repulseForce;
        const fy = (dy / dist) * repulseForce;
        const fz = (dz / dist) * repulseForce;

        const dispV = displacements.get(v)!;
        const dispU = displacements.get(u)!;

        dispV.x += fx; dispV.y += fy; dispV.z += fz;
        dispU.x -= fx; dispU.y -= fy; dispU.z -= fz;
      }
    }

    // Attractive forces along edges
    edges.forEach((edge) => {
      const posV = positions.get(edge.from);
      const posU = positions.get(edge.to);
      if (!posV || !posU) return;

      const dx = posV.x - posU.x;
      const dy = posV.y - posU.y;
      const dz = posV.z - posU.z;
      const dist = getDistance(posV, posU);

      const attractForce = (dist * dist) / k;
      const fx = (dx / dist) * attractForce;
      const fy = (dy / dist) * attractForce;
      const fz = (dz / dist) * attractForce;

      const dispV = displacements.get(edge.from)!;
      const dispU = displacements.get(edge.to)!;

      dispV.x -= fx; dispV.y -= fy; dispV.z -= fz;
      dispU.x += fx; dispU.y += fy; dispU.z += fz;
    });

    // Group cohesion: nodes in same group attract each other more
    if (nodeGroupMap.size > 0) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const gI = nodeGroupMap.get(nodes[i].id);
          const gJ = nodeGroupMap.get(nodes[j].id);
          if (gI && gJ && gI === gJ) {
            const posV = positions.get(nodes[i].id)!;
            const posU = positions.get(nodes[j].id)!;
            const dx = posV.x - posU.x;
            const dy = posV.y - posU.y;
            const dz = posV.z - posU.z;
            const dist = getDistance(posV, posU);

            // Extra attraction for same-group nodes
            const groupForce = (dist * dist) / (k * 0.5);
            const fx = (dx / dist) * groupForce;
            const fy = (dy / dist) * groupForce;
            const fz = (dz / dist) * groupForce;

            const dispV = displacements.get(nodes[i].id)!;
            const dispU = displacements.get(nodes[j].id)!;

            dispV.x -= fx; dispV.y -= fy; dispV.z -= fz;
            dispU.x += fx; dispU.y += fy; dispU.z += fz;
          }
        }
      }
    }

    // Apply displacements clamped by temperature
    nodes.forEach((node) => {
      const id = node.id;
      const pos = positions.get(id)!;
      const disp = displacements.get(id)!;

      const dispLen =
        Math.sqrt(disp.x * disp.x + disp.y * disp.y + disp.z * disp.z) || 1;

      const clampedLen = Math.min(dispLen, temperature);
      pos.x += (disp.x / dispLen) * clampedLen;
      pos.y += (disp.y / dispLen) * clampedLen;
      pos.z += (disp.z / dispLen) * clampedLen;

      // Gentle gravity toward origin
      pos.x *= 0.995;
      pos.y *= 0.995;
      pos.z *= 0.995;
    });
  }

  // Snap z near-zero (keep diagrams flat unless user specifies z)
  nodes.forEach((node) => {
    const pos = positions.get(node.id)!;
    if (Math.abs(pos.z) < 0.5) pos.z = 0;
  });
}