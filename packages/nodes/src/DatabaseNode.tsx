import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { nodeRegistry } from './registry';
import { VerdantNode } from './VerdantNode';

export function DatabaseNode(props: NodeProps & { type?: string }) {
  return <VerdantNode type={props.type || 'database'} {...props} />;
}

nodeRegistry.register('database', DatabaseNode);
