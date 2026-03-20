import React from 'react';

type NodeComponent = React.ComponentType<any>;

const registry = new Map<string, NodeComponent>();

export const NodeRegistry = {
  register: (key: string, comp: NodeComponent) => {
    registry.set(key, comp);
  },
  get: (key: string) => registry.get(key),
  list: () => Array.from(registry.keys()),
};
