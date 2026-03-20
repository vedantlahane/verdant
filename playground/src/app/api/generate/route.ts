import { NextResponse } from "next/server";
import { parseVrdSafe } from "@verdant/parser";

// ── OpenAI client (lazy init) ──────────────────────

let openaiClient: any = null;

async function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (openaiClient) return openaiClient;

  const { OpenAI } = await import("openai");
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

// ── System Prompt (complete per context doc) ───────

const SYSTEM_PROMPT = `You are Verdant AI. You generate .vrd diagram code from English descriptions.

AVAILABLE COMPONENT TYPES:
server, database, cache, gateway, service, user, cloud, queue, storage, monitor

SYNTAX RULES:

1. Config (top of file):
   theme: moss
   layout: auto
   camera: perspective
   
   Theme options: moss, sage, fern, bloom, ash, dusk, stone, ember, frost, canopy
   Layout options: auto, grid, circular
   Camera options: perspective, orthographic

2. Node declaration (simple):
   server web-server
   database postgres
   cache redis

3. Node declaration (with properties):
   database postgres:
     label: "PostgreSQL 16"
     color: "#42f554"
     size: lg
     glow: true
   
   Properties: label (string), color (hex), size (sm|md|lg|xl), glow (true|false), icon (string)

4. Edge declaration (inline):
   web-server -> postgres: "queries"
   web-server -> redis: "cache reads"

5. Edge declaration (with properties):
   web-server -> postgres:
     label: "queries"
     style: animated
     color: "#ffffff"
   
   Edge styles: solid, dashed, animated, dotted

6. Groups:
   group backend "Backend Services":
     server auth
     server users
     server orders

7. Nested groups:
   group vpc "Production VPC":
     group public "Public Subnet":
       server web-1
       server web-2
     group private "Private Subnet":
       database primary-db

8. Group member connections (dot notation):
   api-gw -> backend.auth: "authenticates"

9. Comments:
   # This is a comment

RULES:
- IDs must be kebab-case (lowercase, hyphens only): web-server, primary-db
- Use meaningful IDs that describe the component
- Always include a theme (default: moss)
- Always include layout if more than 3 nodes (default: auto)
- Use labels for clarity on edges
- Group related services together when logical
- Keep it concise but complete

EXAMPLE OUTPUT:
# E-commerce Backend
theme: moss
layout: auto

gateway api-gw:
  label: "API Gateway"

group backend "Core Services":
  service auth:
    label: "Auth Service"
  service catalog:
    label: "Product Catalog"
  service orders:
    label: "Order Service"

database postgres:
  label: "PostgreSQL"
  glow: true

cache redis:
  label: "Redis Cache"

queue events:
  label: "Event Bus"

user client:
  label: "Web Client"

client -> api-gw: "HTTPS"
api-gw -> backend.auth: "authenticate"
api-gw -> backend.catalog: "products"
api-gw -> backend.orders: "checkout"
backend.auth -> postgres: "users"
backend.catalog -> postgres: "products"
backend.catalog -> redis: "cache"
backend.orders -> postgres: "orders"
backend.orders -> events: "order.placed"

CRITICAL:
- Only output valid .vrd code
- No markdown, no code fences, no explanation
- No \`\`\` wrapping
- Start directly with a # comment or theme: line`;

// ── Fallback responses (when no API key) ───────────

const FALLBACK_RESPONSES: Record<string, string> = {
  default: `# Generated Architecture
theme: moss
layout: auto

gateway api-gw:
  label: "API Gateway"

server api:
  label: "API Server"

database main-db:
  label: "Primary Database"

cache redis:
  label: "Redis Cache"

api-gw -> api: "routes"
api -> main-db: "reads/writes"
api -> redis: "session cache"`,

  microservices: `# Microservices Architecture
theme: moss
layout: auto

gateway api-gw:
  label: "API Gateway"

group services "Core Services":
  service auth:
    label: "Auth Service"
  service users:
    label: "User Service"
  service orders:
    label: "Order Service"

database postgres:
  label: "PostgreSQL"

cache redis:
  label: "Redis"

user client:
  label: "Client"

client -> api-gw: "HTTPS"
api-gw -> services.auth: "authenticate"
api-gw -> services.users: "user data"
api-gw -> services.orders: "orders"
services.auth -> postgres: "reads"
services.users -> postgres: "reads/writes"
services.orders -> postgres: "reads/writes"
services.orders -> redis: "cache"`,

  pipeline: `# Data Pipeline
theme: sage
layout: auto

storage s3:
  label: "S3 Raw Data"

service ingest:
  label: "Ingestion Service"

queue kafka:
  label: "Kafka"

service processor:
  label: "Stream Processor"

database warehouse:
  label: "Data Warehouse"

monitor grafana:
  label: "Grafana"

s3 -> ingest: "raw files"
ingest -> kafka: "events"
kafka -> processor: "stream"
processor -> warehouse: "batch load"
warehouse -> grafana: "queries"`,
};

function pickFallback(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("microservice") || lower.includes("service")) {
    return FALLBACK_RESPONSES.microservices;
  }
  if (
    lower.includes("pipeline") ||
    lower.includes("data") ||
    lower.includes("etl")
  ) {
    return FALLBACK_RESPONSES.pipeline;
  }
  return FALLBACK_RESPONSES.default;
}

// ── Route Handler ──────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: string };

    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const prompt = body.prompt.trim();

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // ── Try OpenAI ─────────────────────────────

    const openai = await getOpenAI();

    if (!openai) {
      // No API key — return smart fallback
      console.warn(
        "[Verdant AI] No OPENAI_API_KEY found. Returning fallback response."
      );
      await new Promise((r) => setTimeout(r, 1200)); // Simulate latency
      const code = pickFallback(prompt);
      return NextResponse.json({ code });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 1500,
    });

    const rawOutput = response.choices[0]?.message?.content || "";

    // ── Clean output ───────────────────────────

    let cleanOutput = rawOutput
      .replace(/^```(?:vrd|yaml|text)?\s*\n?/gm, "")
      .replace(/\n?```\s*$/gm, "")
      .trim();

    // ── Validate the generated code ────────────

    const parseResult = parseVrdSafe(cleanOutput);
    const errors = parseResult.diagnostics.filter(
      (d) => d.severity === "error"
    );

    if (errors.length > 0) {
      console.warn(
        "[Verdant AI] Generated code has parse errors:",
        errors.map((e) => e.message)
      );
      // Still return it — user can fix in editor
      // But add a warning header
      return NextResponse.json({
        code: cleanOutput,
        warning: `Generated code has ${errors.length} parse issue(s). You may need to adjust it.`,
      });
    }

    return NextResponse.json({ code: cleanOutput });
  } catch (error: unknown) {
    console.error("[Verdant AI] Generation error:", error);

    // Handle rate limiting
    if (
      error instanceof Error &&
      error.message.includes("429")
    ) {
      return NextResponse.json(
        { error: "Rate limited. Please try again in a moment." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate diagram",
      },
      { status: 500 }
    );
  }
}