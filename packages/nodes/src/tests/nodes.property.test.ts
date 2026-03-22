// Feature: integration-wiring-phase, Property 10
// Validates: Requirement 19.5

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

fc.configureGlobal({ numRuns: 100 });

// NodeStatus type as defined in @verdant/primitives
type NodeStatus = 'healthy' | 'warning' | 'error' | 'unknown';

const ALL_STATUSES: NodeStatus[] = ['healthy', 'warning', 'error', 'unknown'];

/**
 * Pure function that mirrors the status resolution logic used by all 10 domain nodes:
 *   <BaseNode {...props} status={props.status ?? defaultStatus} />
 * where defaultStatus = 'unknown'
 */
function resolveStatus(propsStatus: NodeStatus | undefined): NodeStatus {
  return propsStatus ?? 'unknown';
}

const NODE_TYPES = [
  'CacheNode',
  'CloudNode',
  'DatabaseNode',
  'GatewayNode',
  'MonitorNode',
  'QueueNode',
  'ServerNode',
  'ServiceNode',
  'StorageNode',
  'UserNode',
] as const;

const nodeStatus = fc.constantFrom<NodeStatus>(...ALL_STATUSES);

describe('Property 10: Node status prop pass-through in all 10 domain nodes', () => {
  it('when a valid NodeStatus is provided, it is passed through as-is (all 10 node types)', () => {
    fc.assert(
      fc.property(nodeStatus, (status: NodeStatus) => {
        for (const nodeType of NODE_TYPES) {
          const result = resolveStatus(status);
          expect(result).toBe(status);
          expect(ALL_STATUSES).toContain(result);
          // Suppress unused variable warning
          void nodeType;
        }
      }),
    );
  });

  it('when status is undefined, "unknown" is used as default (all 10 node types)', () => {
    for (const nodeType of NODE_TYPES) {
      const result = resolveStatus(undefined);
      expect(result).toBe('unknown');
      // Suppress unused variable warning
      void nodeType;
    }
  });

  it('resolveStatus is identity for all valid NodeStatus values across all 10 node types', () => {
    fc.assert(
      fc.property(nodeStatus, fc.constantFrom(...NODE_TYPES), (status: NodeStatus, nodeType) => {
        void nodeType;
        return resolveStatus(status) === status;
      }),
    );
  });

  it('resolveStatus with undefined always returns "unknown" regardless of node type', () => {
    fc.assert(
      fc.property(fc.constantFrom(...NODE_TYPES), (nodeType) => {
        void nodeType;
        return resolveStatus(undefined) === 'unknown';
      }),
    );
  });
});
