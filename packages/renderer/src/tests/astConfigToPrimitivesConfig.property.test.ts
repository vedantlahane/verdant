// Feature: integration-wiring-phase, Property 4
// Validates: Requirements 11.2, 11.3, 11.4

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { astConfigToPrimitivesConfig } from '../VerdantRenderer';
import type { VrdConfig } from '@verdant/parser';

fc.configureGlobal({ numRuns: 100 });

/**
 * Property 4: AST config → PrimitivesConfig mapping is total
 *
 * For any randomly generated VrdConfig, astConfigToPrimitivesConfig must:
 * - Set minimap.enabled = true iff config.minimap === true
 * - Set postProcessing.enabled = true iff config['post-processing'] === true
 * - Set postProcessing.bloom.intensity = config['bloom-intensity'] when it's a number, 1.0 otherwise
 */

/** Arbitrary for VrdConfig — covers all relevant combinations */
const vrdConfigArb: fc.Arbitrary<VrdConfig> = fc.record({
  minimap: fc.option(fc.boolean(), { nil: undefined }),
  'post-processing': fc.option(fc.boolean(), { nil: undefined }),
  'bloom-intensity': fc.option(
    fc.oneof(
      fc.float({ min: 0, max: 10, noNaN: true }),
      fc.integer({ min: 0, max: 100 }),
    ),
    { nil: undefined },
  ),
}).map(cfg => {
  // Remove undefined keys to keep the config clean
  const clean: VrdConfig = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (v !== undefined) (clean as Record<string, unknown>)[k] = v;
  }
  return clean;
});

describe('Property 4: AST config → PrimitivesConfig mapping is total', () => {
  it('minimap.enabled is true when config.minimap === true, false otherwise', () => {
    fc.assert(
      fc.property(vrdConfigArb, (config) => {
        const result = astConfigToPrimitivesConfig(config);
        const expected = config.minimap === true;
        expect(result.minimap?.enabled).toBe(expected);
      }),
    );
  });

  it('postProcessing.enabled is true when config["post-processing"] === true, false otherwise', () => {
    fc.assert(
      fc.property(vrdConfigArb, (config) => {
        const result = astConfigToPrimitivesConfig(config);
        const expected = config['post-processing'] === true;
        expect(result.postProcessing?.enabled).toBe(expected);
      }),
    );
  });

  it('postProcessing.bloom.intensity equals config["bloom-intensity"] when a number, defaults to 1.0 otherwise', () => {
    fc.assert(
      fc.property(vrdConfigArb, (config) => {
        const result = astConfigToPrimitivesConfig(config);
        const bloomIntensity = config['bloom-intensity'];
        const expected = typeof bloomIntensity === 'number' ? bloomIntensity : 1.0;
        expect(result.postProcessing?.bloom?.intensity).toBe(expected);
      }),
    );
  });

  it('mapping is total — never throws for any VrdConfig input', () => {
    fc.assert(
      fc.property(vrdConfigArb, (config) => {
        expect(() => astConfigToPrimitivesConfig(config)).not.toThrow();
      }),
    );
  });
});
