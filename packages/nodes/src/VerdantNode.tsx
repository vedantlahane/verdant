// packages/nodes/src/VerdantNode.tsx

import React from 'react';
import { BaseNode, NodeProps } from '@verdant/primitives';
import { NODE_TYPE_DEFAULTS } from './nodeDefaults';

export interface VerdantNodeProps extends NodeProps {
  type: string;
}

/**
 * Generic node component that handles shape and default behavior 
 * based on node type from the Verdant Language Reference.
 */
export function VerdantNode({ type, ...props }: VerdantNodeProps) {
  const defaults = NODE_TYPE_DEFAULTS[type.toLowerCase()] || { shape: 'cube' };
  
  return (
    <BaseNode 
      {...props} 
      shape={props.shape ?? defaults.shape}
      color={props.color ?? defaults.color}
    />
  );
}
