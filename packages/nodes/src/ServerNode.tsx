import React from 'react';
import { NodeProps } from '@verdant/primitives';
import { nodeRegistry } from './registry';
import { VerdantNode } from './VerdantNode';

export function ServerNode(props: NodeProps & { type?: string }) {
  return <VerdantNode type={props.type || 'server'} {...props} />;
}

nodeRegistry.register('server', ServerNode);
