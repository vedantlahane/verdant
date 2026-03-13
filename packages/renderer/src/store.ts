import { create } from 'zustand';
import { VrdAST } from '@repo/parser';
import { computeLayout, LayoutType } from './layout';

export interface RendererState {
  ast: VrdAST | null;
  positions: Record<string, [number, number, number]>;
  selectedNodeId: string | null;
  
  setAst: (ast: VrdAST) => void;
  selectNode: (id: string | null) => void;
}

export const useRendererStore = create<RendererState>((set) => ({
  ast: null,
  positions: {},
  selectedNodeId: null,

  setAst: (ast) => {
    // Generate layout based on AST config or default to 'auto'
    const requestedLayout = (ast.config.layout as LayoutType) || 'auto';
    const computed = computeLayout(ast.nodes, ast.edges, requestedLayout);
    
    const positions: Record<string, [number, number, number]> = {};
    for (const [id, pos] of computed.entries()) {
      positions[id] = [pos.x, pos.y, pos.z];
    }

    set({ ast, positions, selectedNodeId: null });
  },

  selectNode: (id) => set({ selectedNodeId: id })
}));
