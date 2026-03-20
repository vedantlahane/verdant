import { KNOWN_NODE_TYPES } from "@verdant/parser";

export const PRESETS: Record<
  string,
  { label: string; description: string; code: string }
> = {
  simple: {
    label: "Simple Stack",
    description: "Server + Database + Cache",
    code: `# Simple Web Stack
theme: moss

server web
database db
cache redis

web -> db: "queries"
web -> redis: "reads"`,
  },
  microservices: {
    label: "Microservices",
    description: "Gateway + service group",
    code: `# Microservices Architecture
theme: moss
layout: auto

gateway api-gw:
  label: "API Gateway"

group backend "Backend APIs":
  service users
  service orders
  service inventory

user client

client -> api-gw: "REST"
api-gw -> backend.users: "/v1/users"
api-gw -> backend.orders: "/v1/orders"
api-gw -> backend.inventory: "/v1/stock"`,
  },
  pipeline: {
    label: "Data Pipeline",
    description: "Ingest → Process → Store",
    code: `# Data Pipeline
theme: sage
layout: auto

monitor grafana
storage s3
queue kafka
service processor
database warehouse

s3 -> processor: "raw events"
processor -> kafka: "normalized"
kafka -> warehouse: "batch insert"
warehouse -> grafana: "dashboard"`,
  },
  fullstack: {
    label: "Full Stack",
    description: "CDN → API → DB + Cache",
    code: `# Full Stack Architecture
theme: fern
layout: auto

user client:
  label: "Browser"

gateway cdn:
  label: "CDN Edge"

server api:
  label: "API Server"
  size: lg

database postgres:
  label: "PostgreSQL"
  glow: true

cache redis:
  label: "Redis"

queue events:
  label: "Event Bus"

monitor grafana:
  label: "Grafana"

client -> cdn: "HTTPS"
cdn -> api: "origin"
api -> postgres: "reads/writes"
api -> redis: "cache"
api -> events: "publish"
events -> grafana: "metrics"`,
  },
  cloud: {
    label: "Cloud Infra",
    description: "Load balancer + cluster",
    code: `# Cloud Infrastructure
theme: frost
layout: auto

user traffic:
  label: "Traffic"

gateway alb:
  label: "Load Balancer"

group cluster "App Cluster":
  server app-1:
    label: "Instance A"
  server app-2:
    label: "Instance B"
  server app-3:
    label: "Instance C"

database rds:
  label: "Aurora DB"
  glow: true

cache elasticache:
  label: "ElastiCache"

storage s3:
  label: "S3 Assets"

traffic -> alb: "HTTPS"
alb -> cluster.app-1: "round robin"
alb -> cluster.app-2: "round robin"
alb -> cluster.app-3: "round robin"
cluster.app-1 -> rds: "rw"
cluster.app-2 -> rds: "rw"
cluster.app-3 -> elasticache: "cache"
cluster.app-1 -> s3: "assets"`,
  },
};

export const NODE_TYPES = [...KNOWN_NODE_TYPES];
export const CONFIG_KEYS = ["theme", "layout", "camera", "pack"];
export const PROP_KEYS = ["label", "color", "size", "glow", "icon", "position"];
export const THEME_VALUES = [
  "moss", "sage", "fern", "bloom", "ash",
  "dusk", "stone", "ember", "frost", "canopy",
];
export const LAYOUT_VALUES = ["auto", "grid", "circular"];
export const SIZE_VALUES = ["sm", "md", "lg", "xl"];
export const BOOL_VALUES = ["true", "false"];
