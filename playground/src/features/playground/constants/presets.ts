// features/playground/constants/presets.ts

import type { Preset } from "../types";

/**
 * Built-in .vrd presets for the playground preset picker.
 * Frozen to prevent mutation — values are compile-time constants.
 */
export const PRESETS: Readonly<Record<string, Preset>> = Object.freeze({
  simple: Object.freeze({
    label: "Simple Stack",
    description: "Server + Database + Cache",
    code: `# Simple Web Stack
theme: moss

server web
database db
cache redis

web -> db: "queries"
web -> redis: "reads"`,
  }),

  microservices: Object.freeze({
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
  }),

  pipeline: Object.freeze({
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
  }),

  fullstack: Object.freeze({
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
  }),

  cloud: Object.freeze({
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
  }),

  security: Object.freeze({
    label: "Security Stack",
    description: "Auth + WAF + Vault",
    code: `# Security Architecture
theme: dusk
layout: auto

user client:
  label: "Client"

waf edge-waf:
  label: "WAF"

auth cognito:
  label: "Auth Provider"
  glow: true

gateway api:
  label: "API Gateway"

vault secrets:
  label: "Secret Store"

certificate tls:
  label: "TLS Cert"

server app:
  label: "Application"

database db:
  label: "Encrypted DB"

client -> edge-waf: "HTTPS"
edge-waf -> api: "filtered"
api -> cognito: "verify token"
api -> app: "authorized"
app -> secrets: "fetch secrets"
app -> db: "encrypted queries"
tls -> api: "terminate"`,
  }),

  "hierarchical-microservices": Object.freeze({
    label: "Hierarchical Microservices",
    description: "Layered services with hierarchical layout",
    code: `# Hierarchical Microservices
theme: moss
layout: hierarchical
direction: LR

gateway api-gw:
  label: "API Gateway"

auth auth-svc:
  label: "Auth Service"

service user-service:
  label: "User Service"

service order-service:
  label: "Order Service"

service inventory-service:
  label: "Inventory Service"

service payment-service:
  label: "Payment Service"

database db:
  label: "Primary DB"
  glow: true

cache redis:
  label: "Cache"

api-gw -> auth-svc: "verify"
api-gw -> user-service: "/users"
api-gw -> order-service: "/orders"
api-gw -> inventory-service: "/stock"
order-service -> payment-service: "charge"
order-service -> inventory-service: "reserve"
user-service -> db: "read/write"
order-service -> db: "read/write"
inventory-service -> db: "read/write"
payment-service -> db: "transactions"
user-service -> redis: "session"
order-service -> redis: "cache"`,
  }),

  "flow-pipeline": Object.freeze({
    label: "Flow Pipeline",
    description: "Data pipeline with animated flow particles",
    code: `# Flow Pipeline
theme: sage
layout: auto

service source:
  label: "Data Source"

service processor:
  label: "Processor"

queue queue:
  label: "Message Queue"

database sink:
  label: "Data Sink"

monitor monitor:
  label: "Monitor"

source -> processor:
  label: "raw data"
  flow: true
  flow-speed: 1.5

processor -> queue:
  label: "normalized"
  flow: true
  flow-speed: 1.5

queue -> sink:
  label: "batch"
  flow: true
  flow-speed: 2.0

sink -> monitor:
  label: "metrics"
  flow: true
  flow-speed: 1.0`,
  }),

  "collapsed-groups": Object.freeze({
    label: "Collapsed Groups",
    description: "Architecture with collapsible service groups",
    code: `# Collapsed Groups
theme: fern
layout: auto

gateway api-gw:
  label: "API Gateway"

group legacy "Legacy Services":
  collapsed: true
  service billing:
    label: "Billing"
  service reporting:
    label: "Reporting"
  database legacy-db:
    label: "Legacy DB"

group modern "Modern Services":
  service users:
    label: "Users"
  service orders:
    label: "Orders"

database main-db:
  label: "Main DB"
  glow: true

api-gw -> modern.users: "REST"
api-gw -> modern.orders: "REST"
api-gw -> legacy.billing: "SOAP"
modern.orders -> main-db: "rw"
modern.users -> main-db: "rw"`,
  }),

  "node-status-demo": Object.freeze({
    label: "Node Status Demo",
    description: "All node status values: healthy, warning, error, unknown",
    code: `# Node Status Demo
theme: ash
layout: auto

service api:
  label: "API Server"
  status: healthy
  glow: true

service worker:
  label: "Background Worker"
  status: warning

service legacy:
  label: "Legacy Service"
  status: error

service external:
  label: "External Dep"
  status: unknown

database db:
  label: "Database"
  status: healthy

cache redis:
  label: "Cache"
  status: warning

api -> db: "queries"
api -> redis: "cache"
api -> worker: "jobs"
worker -> legacy: "sync"
api -> external: "calls"`,
  }),

  "bloom-showcase": Object.freeze({
    label: "Bloom Showcase",
    description: "Post-processing with bloom effect",
    code: `# Bloom Showcase
theme: bloom
layout: auto
post-processing: true
bloom-intensity: 1.5

gateway cdn:
  label: "CDN"
  glow: true

server api:
  label: "API"
  glow: true

database db:
  label: "Database"
  glow: true

cache redis:
  label: "Cache"
  glow: true

monitor grafana:
  label: "Grafana"

cdn -> api: "requests"
api -> db: "queries"
api -> redis: "cache"
api -> grafana: "metrics"`,
  }),
});

/** Ordered preset keys for UI iteration */
export const PRESET_KEYS: readonly string[] = Object.freeze(
  Object.keys(PRESETS),
);

/** Default preset loaded on first visit */
export const DEFAULT_PRESET_KEY = "simple" as const;