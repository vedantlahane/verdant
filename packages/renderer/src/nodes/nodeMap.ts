// nodeMap.ts

import { NodeProps } from '@verdant/primitives';
import {
  ServerNode,
  DatabaseNode,
  CacheNode,
  GatewayNode,
  ServiceNode,
  UserNode,
  QueueNode,
  CloudNode,
  StorageNode,
  MonitorNode,
} from '@verdant/nodes';

export const NODE_MAP: Record<string, React.ComponentType<NodeProps>> = {
  server: ServerNode,
  database: DatabaseNode,
  cache: CacheNode,
  gateway: GatewayNode,
  service: ServiceNode,
  user: UserNode,
  client: UserNode,
  queue: QueueNode,
  cloud: CloudNode,
  storage: StorageNode,
  monitor: MonitorNode,
};

export const FALLBACK_NODE = ServerNode;