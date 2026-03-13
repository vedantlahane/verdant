import { VrdNode, VrdEdge } from '@repo/parser';

export type LayoutType = 'auto' | 'grid' | 'circular';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export function computeLayout(
  nodes: VrdNode[],
  edges: VrdEdge[],
  layoutType: LayoutType
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
      computeForceDirectedLayout(nodes, edges, positions);
      break;
  }

  // Override with user-defined positions if any exist in the props
  for (const node of nodes) {
    const existing = positions.get(node.id) || { x: 0, y: 0, z: 0 };
    if (node.props.x !== undefined) existing.x = Number(node.props.x);
    if (node.props.y !== undefined) existing.y = Number(node.props.y);
    if (node.props.z !== undefined) existing.z = Number(node.props.z);
    positions.set(node.id, existing);
  }

  return positions;
}

function computeGridLayout(nodes: VrdNode[], positions: Map<string, Position3D>) {
  const columns = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 3;

  nodes.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    // Center the grid around origin (0,0,0)
    const x = (col - (columns - 1) / 2) * spacing;
    const y = (row - (Math.ceil(nodes.length / columns) - 1) / 2) * -spacing;

    positions.set(node.id, { x, y, z: 0 });
  });
}

function computeCircularLayout(nodes: VrdNode[], positions: Map<string, Position3D>) {
  const count = nodes.length;
  const spacing = 2.5; // distance along circumference
  const radius = Math.max(spacing * count / (2 * Math.PI), 3);

  nodes.forEach((node, index) => {
    const angle = (index / count) * Math.PI * 2;
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius
    });
  });
}

function computeForceDirectedLayout(nodes: VrdNode[], edges: VrdEdge[], positions: Map<string, Position3D>) {
  // Simple 2D/3D force-directed graph algorithm loosely based on Fruchterman-Reingold
  const area = nodes.length * 20;
  const k = Math.sqrt(area / nodes.length);
  const iterations = 100;
  
  // Initialize with random positions within a small sphere
  nodes.forEach(node => {
    positions.set(node.id, {
      x: (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 4
    });
  });

  const getDistance = (p1: Position3D, p2: Position3D) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
  };

  for (let iter = 0; iter < iterations; iter++) {
    const temperature = (iterations - iter) / iterations * 2.0;
    
    // Store displacements for this iteration
    const displacements = new Map<string, Position3D>();
    nodes.forEach(node => displacements.set(node.id, { x: 0, y: 0, z: 0 }));

    // Calculate repulsive forces between all pairs of nodes
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

            if (dist > 0) {
                const repulseForce = (k * k) / dist;
                const dispV = displacements.get(v)!;
                const dispU = displacements.get(u)!;

                dispV.x += (dx / dist) * repulseForce;
                dispV.y += (dy / dist) * repulseForce;
                dispV.z += (dz / dist) * repulseForce;

                dispU.x -= (dx / dist) * repulseForce;
                dispU.y -= (dy / dist) * repulseForce;
                dispU.z -= (dz / dist) * repulseForce;
            }
        }
    }

    // Calculate attractive forces along edges
    edges.forEach(edge => {
        const v = edge.from;
        const u = edge.to;
        
        // Edge nodes might not exist if AST is invalid
        if (!positions.has(v) || !positions.has(u)) return;

        const posV = positions.get(v)!;
        const posU = positions.get(u)!;

        const dx = posV.x - posU.x;
        const dy = posV.y - posU.y;
        const dz = posV.z - posU.z;
        const dist = getDistance(posV, posU);

        if (dist > 0) {
            const attractForce = (dist * dist) / k;
            const dispV = displacements.get(v)!;
            const dispU = displacements.get(u)!;

            dispV.x -= (dx / dist) * attractForce;
            dispV.y -= (dy / dist) * attractForce;
            dispV.z -= (dz / dist) * attractForce;

            dispU.x += (dx / dist) * attractForce;
            dispU.y += (dy / dist) * attractForce;
            dispU.z += (dz / dist) * attractForce;
        }
    });

    // Apply displacements, scaled by temperature
    nodes.forEach(node => {
        const id = node.id;
        const pos = positions.get(id)!;
        const disp = displacements.get(id)!;

        const dispLength = Math.sqrt(disp.x * disp.x + disp.y * disp.y + disp.z * disp.z) || 1;
        
        pos.x += (disp.x / dispLength) * Math.min(dispLength, temperature);
        pos.y += (disp.y / dispLength) * Math.min(dispLength, temperature);
        pos.z += (disp.z / dispLength) * Math.min(dispLength, temperature);
        
        // Add a gentle gravity to origin pulling everything towards center over time
        pos.x -= pos.x * 0.01;
        pos.y -= pos.y * 0.01;
        pos.z -= pos.z * 0.01;
    });
  }
}
