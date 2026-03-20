type NodeDef<T = any> = {
  type: string;
  metadata?: Record<string, any>;
  render: T;
};

const communityRegistry = new Map<string, NodeDef>();

export function defineNode<T = any>(def: NodeDef<T>) {
  if (!def || !def.type) throw new Error('defineNode requires a { type }');
  communityRegistry.set(def.type, def);
  return def;
}

export function getDefinedNode(type: string) {
  return communityRegistry.get(type);
}

export function listDefinedNodes() {
  return Array.from(communityRegistry.keys());
}

export type { NodeDef };
