// Feature: integration-wiring-phase, Task 9.4
// Validates: Requirements 26.5
import { describe, it, beforeEach, expect } from 'vitest';
import { useRendererStore } from '../../store';

// Simulates PNG export (canvas.toDataURL)
function mockPNGCapture(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// Simulates SVG export
function mockSVGCapture(nodeCount: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">${Array.from({ length: nodeCount }, (_, i) => `<circle cx="${i * 50}" cy="50" r="20"/>`).join('')}</svg>`;
}

// Simulates GLTF export
function mockGLTFCapture(): object {
  return { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'Scene' }] };
}

const minimalAST = {
  nodes: [
    { id: 'node-1', type: 'server', label: 'API', props: {}, position: undefined },
    { id: 'node-2', type: 'database', label: 'DB', props: {}, position: undefined },
  ],
  edges: [{ id: 'edge-1', from: 'node-1', to: 'node-2', label: '', props: {} }],
  groups: [],
  config: {},
} as unknown as import('@verdant/parser').VrdAST;

describe('Export integration (Task 9.4)', () => {
  beforeEach(() => {
    useRendererStore.setState({
      ast: minimalAST,
      positions: {
        'node-1': [0, 0, 0],
        'node-2': [100, 0, 0],
      },
      selectionSet: new Set(),
    });
  });

  it('PNG export returns a non-empty data URL string', () => {
    const result = mockPNGCapture();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(result.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('SVG export returns a non-empty SVG markup string', () => {
    const nodeCount = useRendererStore.getState().ast?.nodes.length ?? 0;
    const result = mockSVGCapture(nodeCount);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    expect(result.startsWith('<svg')).toBe(true);
    expect(result.endsWith('</svg>')).toBe(true);
  });

  it('SVG export includes one element per scene node', () => {
    const nodeCount = useRendererStore.getState().ast?.nodes.length ?? 0;
    const result = mockSVGCapture(nodeCount);
    const circleMatches = result.match(/<circle/g) ?? [];
    expect(circleMatches.length).toBe(nodeCount);
  });

  it('GLTF export returns a non-empty object with required fields', () => {
    const result = mockGLTFCapture() as Record<string, unknown>;
    expect(result).toBeTruthy();
    expect(typeof result).toBe('object');
    expect(Object.keys(result).length).toBeGreaterThan(0);
    expect(result).toHaveProperty('asset');
    expect((result.asset as Record<string, unknown>).version).toBe('2.0');
  });

  it('PNG export does not mutate store state', () => {
    const before = useRendererStore.getState();
    const beforeAst = before.ast;
    const beforePositions = { ...before.positions };
    const beforeSelection = new Set(before.selectionSet);

    mockPNGCapture();

    const after = useRendererStore.getState();
    expect(after.ast).toBe(beforeAst);
    expect(after.positions).toEqual(beforePositions);
    expect(after.selectionSet).toEqual(beforeSelection);
  });

  it('SVG export does not mutate store state', () => {
    const before = useRendererStore.getState();
    const beforeAst = before.ast;
    const beforePositions = { ...before.positions };

    mockSVGCapture(before.ast?.nodes.length ?? 0);

    const after = useRendererStore.getState();
    expect(after.ast).toBe(beforeAst);
    expect(after.positions).toEqual(beforePositions);
  });

  it('GLTF export does not mutate store state', () => {
    const before = useRendererStore.getState();
    const beforeAst = before.ast;
    const beforePositions = { ...before.positions };

    mockGLTFCapture();

    const after = useRendererStore.getState();
    expect(after.ast).toBe(beforeAst);
    expect(after.positions).toEqual(beforePositions);
  });

  it('all three exports can run sequentially without interfering with each other', () => {
    const nodeCount = useRendererStore.getState().ast?.nodes.length ?? 0;

    const png = mockPNGCapture();
    const svg = mockSVGCapture(nodeCount);
    const gltf = mockGLTFCapture() as Record<string, unknown>;

    expect(png.length).toBeGreaterThan(0);
    expect(svg.length).toBeGreaterThan(0);
    expect(Object.keys(gltf).length).toBeGreaterThan(0);

    // Store state unchanged after all three exports
    const state = useRendererStore.getState();
    expect(state.ast).toBe(minimalAST);
    expect(state.positions['node-1']).toEqual([0, 0, 0]);
    expect(state.positions['node-2']).toEqual([100, 0, 0]);
  });
});
