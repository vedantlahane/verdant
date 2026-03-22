// primitives/src/layout/HierarchicalLayout.ts

import * as THREE from 'three';
import type { TransitionEngine } from '../animation/TransitionEngine';

// ── Public Types ────────────────────────────────────────────

export interface LayoutNode {
  id: string;
  width?: number;
  height?: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  weight?: number;
}

export interface LayoutResult {
  positions: Map<string, THREE.Vector3>;
  layers: Map<string, number>;
}

export type LayoutDirection = 'top-down' | 'bottom-up' | 'left-right' | 'right-left';

export interface HierarchicalLayoutOptions {
  /** Horizontal spacing between nodes in the same layer. @default 3 */
  nodeSpacing?: number;
  /** Vertical spacing between layers. @default 3 */
  layerSpacing?: number;
  /** Number of crossing minimization passes. @default 3 */
  optimizationPasses?: number;
  /** Layout direction. @default "top-down" */
  direction?: LayoutDirection;
  /** Y position of the first layer (ground plane). @default 0 */
  baseY?: number;
}

// ── Constants ───────────────────────────────────────────────

const DFS_WHITE = 0;
const DFS_GRAY = 1;
const DFS_BLACK = 2;

// ── Implementation ──────────────────────────────────────────

/**
 * Sugiyama-style hierarchical layout algorithm.
 *
 * 1. **Cycle breaking** — DFS-based back-edge reversal to produce a DAG
 * 2. **Layer assignment** — longest-path from root nodes
 * 3. **Crossing minimization** — barycenter heuristic (configurable passes)
 * 4. **Coordinate assignment** — centered positioning per layer
 *
 * Supports animated layout transitions via `TransitionEngine`.
 *
 * @example
 * ```ts
 * const layout = new HierarchicalLayout({ direction: 'left-right', layerSpacing: 4 });
 * const result = layout.compute(nodes, edges);
 * await layout.apply(result, transitionEngine);
 * ```
 */
export class HierarchicalLayout {
  private readonly _nodeSpacing: number;
  private readonly _layerSpacing: number;
  private readonly _optimizationPasses: number;
  private readonly _direction: LayoutDirection;
  private readonly _baseY: number;

  constructor(options?: HierarchicalLayoutOptions) {
    this._nodeSpacing = options?.nodeSpacing ?? 3;
    this._layerSpacing = options?.layerSpacing ?? 3;
    this._optimizationPasses = options?.optimizationPasses ?? 3;
    this._direction = options?.direction ?? 'top-down';
    this._baseY = options?.baseY ?? 0;
  }

  /**
   * Compute layout positions for the given nodes and edges.
   */
  compute(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutResult {
    if (nodes.length === 0) {
      return { positions: new Map(), layers: new Map() };
    }

    const nodeIds = new Set(nodes.map((n) => n.id));

    // Filter edges to only include nodes that exist
    const validEdges = edges.filter(
      (e) => nodeIds.has(e.from) && nodeIds.has(e.to),
    );

    // Step 1: Break cycles
    const dagEdges = this._breakCycles(nodeIds, validEdges);

    // Step 2: Build adjacency lists (used throughout)
    const { successors, predecessors } = this._buildAdjacency(nodeIds, dagEdges);

    // Step 3: Assign layers via longest-path
    const layers = this._assignLayers(nodeIds, predecessors);

    // Step 4: Group nodes by layer
    const layerGroups = this._groupByLayer(layers);

    // Step 5: Crossing minimization
    this._minimizeCrossings(layerGroups, successors, predecessors, layers);

    // Step 6: Assign final positions
    const positions = this._assignPositions(layerGroups);

    return { positions, layers };
  }

  /**
   * Apply layout with animated transition.
   *
   * @param result - Output from `compute()`.
   * @param transitionEngine - Animation engine instance.
   * @param duration - Transition duration in ms. @default 500
   */
  async apply(
    result: LayoutResult,
    transitionEngine: TransitionEngine,
    duration = 500,
  ): Promise<void> {
    await transitionEngine.playLayoutTransition(result.positions, duration);
  }

  // ── Step 1: Cycle Breaking ──────────────────────────────

  private _breakCycles(nodeIds: Set<string>, edges: LayoutEdge[]): LayoutEdge[] {
    const color = new Map<string, number>();
    for (const id of nodeIds) color.set(id, DFS_WHITE);

    // Build adjacency
    const adj = new Map<string, string[]>();
    for (const id of nodeIds) adj.set(id, []);
    for (const e of edges) {
      adj.get(e.from)!.push(e.to);
    }

    const backEdges = new Set<string>();

    const dfs = (u: string): void => {
      color.set(u, DFS_GRAY);
      for (const v of adj.get(u)!) {
        const c = color.get(v);
        if (c === DFS_GRAY) {
          backEdges.add(`${u}->${v}`);
        } else if (c === DFS_WHITE) {
          dfs(v);
        }
      }
      color.set(u, DFS_BLACK);
    };

    for (const id of nodeIds) {
      if (color.get(id) === DFS_WHITE) dfs(id);
    }

    // Reverse back edges
    return edges.map((e) => {
      if (backEdges.has(`${e.from}->${e.to}`)) {
        return { from: e.to, to: e.from, weight: e.weight };
      }
      return e;
    });
  }

  // ── Adjacency Builder ───────────────────────────────────

  private _buildAdjacency(
    nodeIds: Set<string>,
    edges: LayoutEdge[],
  ): {
    successors: Map<string, string[]>;
    predecessors: Map<string, string[]>;
  } {
    const successors = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();

    for (const id of nodeIds) {
      successors.set(id, []);
      predecessors.set(id, []);
    }

    for (const e of edges) {
      successors.get(e.from)!.push(e.to);
      predecessors.get(e.to)!.push(e.from);
    }

    return { successors, predecessors };
  }

  // ── Step 2: Layer Assignment ────────────────────────────

  private _assignLayers(
    nodeIds: Set<string>,
    predecessors: Map<string, string[]>,
  ): Map<string, number> {
    const layers = new Map<string, number>();
    const inDegree = new Map<string, number>();

    for (const id of nodeIds) {
      inDegree.set(id, predecessors.get(id)!.length);
    }

    // Kahn's algorithm with longest-path layer assignment
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const u = queue.shift()!;

      // Layer = 1 + max layer of all predecessors
      const preds = predecessors.get(u)!;
      let layer = 0;
      for (const p of preds) {
        const pl = layers.get(p);
        if (pl !== undefined && pl + 1 > layer) {
          layer = pl + 1;
        }
      }
      layers.set(u, layer);

      // Decrease in-degree of successors
      // (We need successors here — rebuild from predecessors)
      for (const [otherId, otherPreds] of predecessors) {
        if (otherPreds.includes(u)) {
          const newDeg = (inDegree.get(otherId) ?? 1) - 1;
          inDegree.set(otherId, newDeg);
          if (newDeg === 0) queue.push(otherId);
        }
      }
    }

    // Safety: assign layer 0 to any unreached nodes
    for (const id of nodeIds) {
      if (!layers.has(id)) layers.set(id, 0);
    }

    return layers;
  }

  // ── Step 3: Group by Layer ──────────────────────────────

  private _groupByLayer(layers: Map<string, number>): string[][] {
    let maxLayer = 0;
    for (const layer of layers.values()) {
      if (layer > maxLayer) maxLayer = layer;
    }

    const groups: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
    for (const [id, layer] of layers) {
      groups[layer].push(id);
    }
    return groups;
  }

  // ── Step 4: Crossing Minimization ───────────────────────

  private _minimizeCrossings(
    layerGroups: string[][],
    successors: Map<string, string[]>,
    predecessors: Map<string, string[]>,
    layers: Map<string, number>,
  ): void {
    // Position-within-layer index
    const posInLayer = new Map<string, number>();
    for (const group of layerGroups) {
      group.forEach((id, i) => posInLayer.set(id, i));
    }

    for (let pass = 0; pass < this._optimizationPasses; pass++) {
      // ── Forward pass (sort by predecessor barycenter) ──
      for (let l = 1; l < layerGroups.length; l++) {
        const group = layerGroups[l];
        const scores = new Map<string, number>();

        for (const id of group) {
          const preds = predecessors.get(id)!.filter(
            (p) => layers.get(p) === l - 1,
          );
          if (preds.length > 0) {
            let sum = 0;
            for (const p of preds) sum += posInLayer.get(p) ?? 0;
            scores.set(id, sum / preds.length);
          } else {
            scores.set(id, posInLayer.get(id) ?? 0);
          }
        }

        group.sort((a, b) => (scores.get(a) ?? 0) - (scores.get(b) ?? 0));
        group.forEach((id, i) => posInLayer.set(id, i));
      }

      // ── Backward pass (sort by successor barycenter) ──
      for (let l = layerGroups.length - 2; l >= 0; l--) {
        const group = layerGroups[l];
        const scores = new Map<string, number>();

        for (const id of group) {
          const succs = successors.get(id)!.filter(
            (s) => layers.get(s) === l + 1,
          );
          if (succs.length > 0) {
            let sum = 0;
            for (const s of succs) sum += posInLayer.get(s) ?? 0;
            scores.set(id, sum / succs.length);
          } else {
            scores.set(id, posInLayer.get(id) ?? 0);
          }
        }

        group.sort((a, b) => (scores.get(a) ?? 0) - (scores.get(b) ?? 0));
        group.forEach((id, i) => posInLayer.set(id, i));
      }
    }
  }

  // ── Step 5: Position Assignment ─────────────────────────

  private _assignPositions(layerGroups: string[][]): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();

    for (let l = 0; l < layerGroups.length; l++) {
      const group = layerGroups[l];
      const totalWidth = (group.length - 1) * this._nodeSpacing;
      const startOffset = -totalWidth / 2;

      for (let i = 0; i < group.length; i++) {
        const id = group[i];

        // Position within layer (centered)
        const withinLayer = startOffset + i * this._nodeSpacing;

        // Layer offset
        const layerOffset = l * this._layerSpacing;

        // Map to 3D based on direction
        const pos = this._directionToPosition(withinLayer, layerOffset);
        positions.set(id, pos);
      }
    }

    return positions;
  }

  /**
   * Convert abstract (withinLayer, layerOffset) to 3D position
   * based on the configured direction.
   */
  private _directionToPosition(
    withinLayer: number,
    layerOffset: number,
  ): THREE.Vector3 {
    const baseY = this._baseY;

    switch (this._direction) {
      case 'top-down':
        // X = within layer, Y = base, Z = -layer (away from camera)
        return new THREE.Vector3(withinLayer, baseY, -layerOffset);

      case 'bottom-up':
        return new THREE.Vector3(withinLayer, baseY, layerOffset);

      case 'left-right':
        // X = layer, Y = base, Z = within layer
        return new THREE.Vector3(layerOffset, baseY, withinLayer);

      case 'right-left':
        return new THREE.Vector3(-layerOffset, baseY, withinLayer);

      default:
        return new THREE.Vector3(withinLayer, baseY, -layerOffset);
    }
  }
}