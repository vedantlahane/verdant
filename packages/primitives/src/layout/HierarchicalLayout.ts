import * as THREE from 'three';
import { TransitionEngine } from '../animation/TransitionEngine';

export interface LayoutNode {
  id: string;
  width?: number;
  height?: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

export interface LayoutResult {
  positions: Map<string, THREE.Vector3>;
  layers: Map<string, number>;
}

export interface HierarchicalLayoutOptions {
  nodeSpacingX?: number;
  nodeSpacingY?: number;
  optimizationPasses?: number;
}

export class HierarchicalLayout {
  private nodeSpacingX: number;
  private nodeSpacingY: number;
  private optimizationPasses: number;

  constructor(options?: HierarchicalLayoutOptions) {
    this.nodeSpacingX = options?.nodeSpacingX ?? 3;
    this.nodeSpacingY = options?.nodeSpacingY ?? 3;
    this.optimizationPasses = options?.optimizationPasses ?? 3;
  }

  /**
   * Compute layout positions for the given nodes and edges.
   * Returns positions and layer assignments.
   */
  compute(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutResult {
    if (nodes.length === 0) {
      return { positions: new Map(), layers: new Map() };
    }

    const nodeIds = new Set(nodes.map((n) => n.id));

    // Step 1: Break cycles by reversing back edges (DFS-based)
    const dagEdges = this._breakCycles(nodeIds, edges);

    // Step 2: Assign layers via longest-path (topological order)
    const layers = this._assignLayers(nodeIds, dagEdges);

    // Step 3: Group nodes by layer
    const layerGroups = this._groupByLayer(layers);

    // Step 4: Crossing minimization (barycenter heuristic)
    this._minimizeCrossings(layerGroups, dagEdges, layers);

    // Step 5: Assign positions
    const positions = this._assignPositions(layerGroups);

    return { positions, layers };
  }

  /**
   * Apply the computed layout by updating positions and triggering
   * TransitionEngine.playLayoutTransition over 500ms.
   */
  async apply(result: LayoutResult, transitionEngine: TransitionEngine): Promise<void> {
    await transitionEngine.playLayoutTransition(result.positions, 500);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /** DFS-based cycle breaking: reverse back edges to produce a DAG */
  private _breakCycles(nodeIds: Set<string>, edges: LayoutEdge[]): LayoutEdge[] {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const id of nodeIds) color.set(id, WHITE);

    // Build adjacency list (only for nodes that exist)
    const adj = new Map<string, string[]>();
    for (const id of nodeIds) adj.set(id, []);
    for (const e of edges) {
      if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
        adj.get(e.from)!.push(e.to);
      }
    }

    const backEdges = new Set<string>();

    const dfs = (u: string) => {
      color.set(u, GRAY);
      for (const v of adj.get(u) ?? []) {
        if (color.get(v) === GRAY) {
          // back edge — mark for reversal
          backEdges.add(`${u}->${v}`);
        } else if (color.get(v) === WHITE) {
          dfs(v);
        }
      }
      color.set(u, BLACK);
    };

    for (const id of nodeIds) {
      if (color.get(id) === WHITE) dfs(id);
    }

    return edges
      .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
      .map((e) => {
        if (backEdges.has(`${e.from}->${e.to}`)) {
          return { from: e.to, to: e.from };
        }
        return e;
      });
  }

  /** Longest-path layer assignment using topological sort */
  private _assignLayers(nodeIds: Set<string>, edges: LayoutEdge[]): Map<string, number> {
    // Build in-degree and predecessor map
    const inDegree = new Map<string, number>();
    const predecessors = new Map<string, string[]>();
    for (const id of nodeIds) {
      inDegree.set(id, 0);
      predecessors.set(id, []);
    }
    for (const e of edges) {
      inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
      predecessors.get(e.to)!.push(e.from);
    }

    // Kahn's topological sort
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const layers = new Map<string, number>();
    const topoOrder: string[] = [];

    while (queue.length > 0) {
      const u = queue.shift()!;
      topoOrder.push(u);

      // Compute layer: 1 + max layer of predecessors, or 0 if none
      const preds = predecessors.get(u) ?? [];
      let layer = 0;
      for (const p of preds) {
        const pl = layers.get(p) ?? 0;
        if (pl + 1 > layer) layer = pl + 1;
      }
      layers.set(u, layer);

      // Reduce in-degree of successors
      for (const e of edges) {
        if (e.from === u) {
          const newDeg = (inDegree.get(e.to) ?? 1) - 1;
          inDegree.set(e.to, newDeg);
          if (newDeg === 0) queue.push(e.to);
        }
      }
    }

    // Any nodes not reached (shouldn't happen after cycle breaking, but be safe)
    for (const id of nodeIds) {
      if (!layers.has(id)) layers.set(id, 0);
    }

    return layers;
  }

  /** Group node IDs by their layer number, sorted by layer */
  private _groupByLayer(layers: Map<string, number>): string[][] {
    const maxLayer = Math.max(...layers.values());
    const groups: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
    for (const [id, layer] of layers) {
      groups[layer].push(id);
    }
    return groups;
  }

  /** Barycenter crossing minimization */
  private _minimizeCrossings(
    layerGroups: string[][],
    edges: LayoutEdge[],
    layers: Map<string, number>,
  ): void {
    // Build position-within-layer index
    const posInLayer = new Map<string, number>();
    for (const group of layerGroups) {
      group.forEach((id, i) => posInLayer.set(id, i));
    }

    for (let pass = 0; pass < this.optimizationPasses; pass++) {
      // Forward pass: sort each layer by avg position of predecessors in layer above
      for (let l = 1; l < layerGroups.length; l++) {
        const group = layerGroups[l];
        const scores = group.map((id) => {
          const preds = edges
            .filter((e) => e.to === id && layers.get(e.from) === l - 1)
            .map((e) => posInLayer.get(e.from) ?? 0);
          return preds.length > 0 ? preds.reduce((a, b) => a + b, 0) / preds.length : posInLayer.get(id) ?? 0;
        });
        const sorted = group
          .map((id, i) => ({ id, score: scores[i] }))
          .sort((a, b) => a.score - b.score)
          .map((x) => x.id);
        layerGroups[l] = sorted;
        sorted.forEach((id, i) => posInLayer.set(id, i));
      }

      // Backward pass: sort each layer by avg position of successors in layer below
      for (let l = layerGroups.length - 2; l >= 0; l--) {
        const group = layerGroups[l];
        const scores = group.map((id) => {
          const succs = edges
            .filter((e) => e.from === id && layers.get(e.to) === l + 1)
            .map((e) => posInLayer.get(e.to) ?? 0);
          return succs.length > 0 ? succs.reduce((a, b) => a + b, 0) / succs.length : posInLayer.get(id) ?? 0;
        });
        const sorted = group
          .map((id, i) => ({ id, score: scores[i] }))
          .sort((a, b) => a.score - b.score)
          .map((x) => x.id);
        layerGroups[l] = sorted;
        sorted.forEach((id, i) => posInLayer.set(id, i));
      }
    }
  }

  /** Assign final (x, y, z) positions */
  private _assignPositions(layerGroups: string[][]): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    for (let l = 0; l < layerGroups.length; l++) {
      const group = layerGroups[l];
      const y = -l * this.nodeSpacingY;
      const totalWidth = (group.length - 1) * this.nodeSpacingX;
      const startX = -totalWidth / 2;
      group.forEach((id, i) => {
        positions.set(id, new THREE.Vector3(startX + i * this.nodeSpacingX, y, 0));
      });
    }
    return positions;
  }
}
