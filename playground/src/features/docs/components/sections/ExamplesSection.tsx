"use client";

import React from "react";
import {
  DocSection,
  DocSubsection,
  DocParagraph,
  CodeBlock,
} from "../DocSection";

export function ExamplesSection() {
  return (
    <>
      <DocSection title="Examples">
        <DocParagraph>
          Real-world examples demonstrating Verdant's capabilities.
        </DocParagraph>
      </DocSection>

      <DocSection title="Simple Three-Node Diagram">
        <CodeBlock
          code={`server api
database db
cache redis

api -> db: "queries"
api -> redis: "cache lookups"
redis -> db:
  label: "cache miss"
  style: dashed
  color: #f59e0b`}
        />
      </DocSection>

      <DocSection title="Microservice Architecture">
        <CodeBlock
          code={`# Microservice Architecture Diagram
layout: hierarchical
direction: top-down
minimap: true

---

# Clients
user browser:
  label: "Web Browser"
  size: lg
  status: healthy

mobile app:
  label: "Mobile App"
  size: md

---

# API Layer
gateway api-gw:
  label: "API Gateway"
  color: #f59e0b
  status: healthy
  glow: true
  badge top-right: "3"

---

# Services
group backend "Backend Services":
  server user-svc:
    label: "User Service"
    status: healthy
  
  server order-svc:
    label: "Order Service"
    status: warning
    badge top-right: "icon:warning"
  
  server payment-svc:
    label: "Payment Service"
    status: healthy

---

# Data Layer
group data "Data Layer":
  database users-db:
    label: "Users DB"
    status: healthy
  
  database orders-db:
    label: "Orders DB"
    status: healthy
  
  queue order-queue:
    label: "Order Queue"
    status: healthy

---

# Connections
browser -> api-gw: "HTTPS"
app -> api-gw: "HTTPS"

api-gw -> backend.user-svc: "REST"
api-gw -> backend.order-svc: "REST"
api-gw -> backend.payment-svc: "REST"

backend.user-svc -> data.users-db:
  label: "SQL"
  routing: orthogonal

backend.order-svc -> data.orders-db:
  label: "SQL"
  routing: orthogonal

backend.order-svc -> data.order-queue:
  label: "events"
  style: animated
  flow: true
  flow-speed: 1.5
  flow-count: 8`}
        />
      </DocSection>

      <DocSection title="Bidirectional Sync">
        <CodeBlock
          code={`database primary:
  label: "Primary DB"
  status: healthy

database replica:
  label: "Read Replica"
  status: healthy

primary <-> replica:
  label: "replication"
  style: animated
  flow: true
  flow-speed: 3
  flow-color: "#22c55e"`}
        />
      </DocSection>

      <DocSection title="Nested Groups (Cloud Architecture)">
        <CodeBlock
          code={`layout: hierarchical

group aws "AWS Cloud":
  group vpc "Production VPC":
    group public-subnet "Public Subnet":
      loadbalancer alb:
        label: "Application LB"
        status: healthy
    
    group private-subnet-a "Private Subnet A":
      server app-1:
        label: "App Server 1"
        status: healthy
      server app-2:
        label: "App Server 2"
        status: healthy
    
    group private-subnet-b "Private Subnet B":
      database rds:
        label: "RDS PostgreSQL"
        status: healthy
      cache elasticache:
        label: "ElastiCache Redis"
        status: healthy

user client:
  label: "Client"

client -> aws.vpc.public-subnet.alb: "HTTPS"
aws.vpc.public-subnet.alb -> aws.vpc.private-subnet-a.app-1
aws.vpc.public-subnet.alb -> aws.vpc.private-subnet-a.app-2
aws.vpc.private-subnet-a.app-1 -> aws.vpc.private-subnet-b.rds
aws.vpc.private-subnet-a.app-1 -> aws.vpc.private-subnet-b.elasticache`}
        />
      </DocSection>

      <DocSection title="Collapsed Group">
        <CodeBlock
          code={`group legacy "Legacy System":
  collapsed: true
  server monolith
  database oracle-db
  server batch-processor

server modern-api:
  label: "Modern API"

modern-api -> legacy.monolith: "REST adapter"`}
        />
      </DocSection>

      <DocSection title="Status Dashboard">
        <CodeBlock
          code={`layout: grid
post-processing: true
bloom-intensity: 0.6

server api:
  label: "API Gateway"
  status: healthy
  badge top-right: "99.9%"

server auth:
  label: "Auth Service"
  status: healthy

server payments:
  label: "Payment Service"
  status: error
  badge top-right: "icon:error"
  glow: true

server notifications:
  label: "Notification Service"
  status: warning
  badge top-right: "icon:warning"

database main-db:
  label: "Primary Database"
  status: healthy

cache session-cache:
  label: "Session Cache"
  status: unknown`}
        />
      </DocSection>

      <DocSection title="Port-to-Port Connections">
        <CodeBlock
          code={`server api:
  port http-out: bottom
  port cache-conn: right

database db:
  port http-in: top

cache redis:
  port data-in: left

api.http-out -> db.http-in: "SQL"
api.cache-conn -> redis.data-in: "cache reads"`}
        />
      </DocSection>
    </>
  );
}
