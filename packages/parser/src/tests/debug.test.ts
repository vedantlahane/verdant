import { describe, it } from 'vitest';
import { printVrd } from '../printer';
import { parseVrdSafe } from '../parser';

describe('debug', () => {
  it('debug port round-trip', () => {
    const ast = {
      config: {},
      nodes: [{ id: 'aa', type: 'server', props: { ports: [{ name: 'aa', side: 'top' }] } }],
      edges: [],
      groups: [],
    };
    const printed = printVrd(ast as any);
    console.log('printed:', JSON.stringify(printed));
    const result = parseVrdSafe(printed);
    console.log('diagnostics:', JSON.stringify(result.diagnostics));
    console.log('nodes:', JSON.stringify(result.ast.nodes));
  });
});
