"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { parseVrd, VrdParserError } from "@repo/parser";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Image as ImageIcon, Loader2, Monitor, Moon, Share2, Sparkles, Sun, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";
import { useThemeMode } from "./useThemeMode";

const VerdantRenderer = dynamic(
  () => import("@repo/renderer").then((mod) => mod.VerdantRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color:var(--page-bg)]">
        <Loader2 className="h-10 w-10 animate-spin text-[color:var(--accent-primary)]" />
        <span className="text-sm text-[color:var(--text-secondary)]">Loading Verdant renderer...</span>
      </div>
    ),
  },
);

type EditorMount = NonNullable<ComponentProps<typeof Editor>["onMount"]>;
type EditorInstance = Parameters<EditorMount>[0];
type MonacoInstance = Parameters<EditorMount>[1];

const PRESETS = {
  simple: `# Simple Web Stack
theme: moss
server web
database db
web -> db: "queries"`,
  microservices: `# Microservices Architecture
theme: ash
layout: auto
group backend "Backend APIs":
  service users
  service orders
  service inventory
gateway api_gw:
  label: "Kong API Gateway"

cloud aws:
  label: "AWS Cloud"

user client

client -> api_gw: "REST"
api_gw -> backend.users: "/v1/users"
api_gw -> backend.orders: "/v1/orders"
api_gw -> backend.inventory: "/v1/inventory"`,
  aws: `# AWS Infrastructure
theme: stone
cloud aws "us-east-1":
  gateway alb
  group ecs "Fargate Cluster":
    service app1
    service app2
  database rds "Aurora PostgreSQL"
  cache elasticache "Redis"
  storage s3 "Assets"

user -> aws.alb: "HTTPS"
aws.alb -> aws.ecs.app1: "path /auth"
aws.alb -> aws.ecs.app2: "path /api"
aws.ecs.app1 -> aws.rds: "rw"
aws.ecs.app2 -> aws.rds: "rw"
aws.ecs.app2 -> aws.elasticache: "cache data"
aws.ecs.app1 -> aws.s3: "put"`,
  pipeline: `# Data Pipeline
theme: sage
layout: grid

monitor grafana
storage s3
queue kafka
service processor
database warehouse

s3 -> processor: "raw events"
processor -> kafka: "normalized"
kafka -> warehouse: "batch insert"
warehouse -> grafana: "dashboard query"`,
};

export function PlaygroundApp() {
  const [code, setCode] = useState(PRESETS.simple);
  const [isMobile, setIsMobile] = useState(false);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const editorRef = useRef<EditorInstance | null>(null);
  const monaco = useMonaco() as MonacoInstance | null;
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");

  useEffect(() => {
    if (window.location.hash) {
      try {
        const decoded = atob(window.location.hash.slice(1));
        setCode(decoded);
      } catch {
        console.warn("Mangled share link");
      }
    }

    const timer = window.setTimeout(() => setIsRendererReady(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!monaco || monaco.languages.getLanguages().some((language: { id: string }) => language.id === "vrd")) {
      return;
    }

    monaco.languages.register({ id: "vrd" });
    monaco.languages.setMonarchTokensProvider("vrd", {
      keywords: ["server", "database", "cache", "gateway", "service", "user", "group", "cloud", "queue", "storage", "monitor"],
      properties: ["label", "color", "size", "glow", "icon", "position"],
      configs: ["theme", "layout", "camera"],
      operators: ["->", ":"],
      tokenizer: {
        root: [
          [/(server|database|cache|gateway|service|user|group|cloud|queue|storage|monitor)\b/, "keyword"],
          [/(theme|layout|camera)\b/, "config"],
          [/(label|color|size|glow|icon|position)\b/, "property"],
          [/->/, "operator"],
          [/:/, "operator"],
          [/#.*/, "comment"],
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string"],
        ],
        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],
      },    });

    monaco.editor.defineTheme("verdant-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "52B788" },
        { token: "operator", foreground: "E5FFF2" },
        { token: "property", foreground: "74C69D" },
        { token: "config", foreground: "D8F3DC", fontStyle: "bold" },
        { token: "string", foreground: "B7E4C7" },
        { token: "comment", foreground: "4A6E5C", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#0D1F17",
        "editor.foreground": "#D8F3DC",
        "editorLineNumber.foreground": "#4A6E5C",
      },
    });

    monaco.editor.defineTheme("verdant-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "2D6A4F" },
        { token: "operator", foreground: "1F2937" },
        { token: "property", foreground: "40916C" },
        { token: "config", foreground: "2D6A4F", fontStyle: "bold" },
        { token: "string", foreground: "5F8F75" },
        { token: "comment", foreground: "7A8F80", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#F0FDF4",
        "editor.foreground": "#17311F",
        "editorLineNumber.foreground": "#7A8F80",
      },
    });
  }, [monaco]);

  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(resolvedTheme === "dark" ? "verdant-dark" : "verdant-light");
    }
  }, [monaco, resolvedTheme]);

  const parsed = useMemo(() => {
    try {
      return { ast: parseVrd(code), error: null as string | null, errorLine: null as number | null };
    } catch (error) {
      if (error instanceof VrdParserError) {
        return { ast: null, error: error.message, errorLine: error.line };
      }

      return {
        ast: null,
        error: error instanceof Error ? error.message : "Unknown error",
        errorLine: null,
      };
    }
  }, [code]);

  useEffect(() => {
    if (!monaco || !editorRef.current) {
      return;
    }

    const model = editorRef.current.getModel();
    if (!model) {
      return;
    }

    if (parsed.errorLine) {
      monaco.editor.setModelMarkers(model, "owner", [
        {
          startLineNumber: parsed.errorLine,
          startColumn: 1,
          endLineNumber: parsed.errorLine,
          endColumn: 120,
          message: parsed.error ?? "Parse error",
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
      return;
    }

    monaco.editor.setModelMarkers(model, "owner", []);
  }, [monaco, parsed.error, parsed.errorLine, code]);

  useEffect(() => {
    if (!parsed.error) {
      toast.dismiss("vrd-error");
      return;
    }

    const timer = window.setTimeout(() => {
      toast.error(`Syntax Error: ${parsed.error}`, { id: "vrd-error" });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [parsed.error]);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) {
      return;
    }

    setIsGenerating(true);
    setAiError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = (await response.json()) as { code?: string; error?: string };

      if (!response.ok || !data.code) {
        throw new Error(data.error || "Generation failed");
      }

      setCode(data.code);
      setIsAiModalOpen(false);
      setAiPrompt("");
      toast.success("Architecture generated");
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      const encoded = btoa(code);
      const url = new URL(window.location.href);
      url.hash = encoded;
      window.history.replaceState(null, "", url.toString());
      await navigator.clipboard.writeText(url.toString());
      toast.success("Share link copied");
    } catch {
      toast.error("Could not create a local share link");
    }
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      toast.error("No renderer canvas found");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = "verdant-architecture.png";
    anchor.click();
    toast.success("PNG exported");
  };

  const cardClassName = resolvedTheme === "dark"
    ? "border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] text-[color:var(--text-primary)]"
    : "border-[color:var(--border-subtle)] bg-[color:var(--surface)] text-[color:var(--text-primary)]";

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--page-bg)] text-[color:var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--border-subtle)] bg-[color:var(--page-bg)]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[radial-gradient(circle_at_top,rgba(82,183,136,0.28),transparent_65%)]">
              <Sparkles className="h-5 w-5 text-[color:var(--accent-primary)]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Verdant</p>
              <h1 className="text-lg font-semibold">Playground</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 ${cardClassName}`}
            >
              <Wand2 className="h-4 w-4 text-[color:var(--accent-primary)]" />
              <span className="hidden sm:inline">Build with AI</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${cardClassName}`}
              aria-label="Copy share link"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              type="button"
              onClick={handleExportPNG}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${cardClassName}`}
              aria-label="Export diagram as PNG"
            >
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (themeMode === "system") {
                  setThemeMode(resolvedTheme === "dark" ? "light" : "dark");
                  return;
                }
                setThemeMode(themeMode === "dark" ? "light" : "dark");
              }}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${cardClassName}`}
              aria-label="Toggle light and dark theme"
            >
              {themeMode === "system" ? (
                <Monitor className="h-4 w-4" />
              ) : resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]/70 p-4 lg:flex lg:flex-col">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Examples</p>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Swap in a preset, tweak the schema, and watch the scene update live.</p>
          </div>

          <div className="space-y-2">
            {Object.entries(PRESETS).map(([key, value]) => {
              const isActive = value === code;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCode(value)}
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                    isActive
                      ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-glow)] text-[color:var(--text-primary)]"
                      : "border-transparent text-[color:var(--text-secondary)] hover:border-[color:var(--border-subtle)] hover:bg-[color:var(--surface)]",
                  ].join(" ")}
                >
                  <span className="block font-medium text-[color:var(--text-primary)]">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
                    {value.split("\n")[0].replace("# ", "")}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-6">
            <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          </div>
        </aside>

        <PanelGroup orientation={isMobile ? "vertical" : "horizontal"}>
          <Panel defaultSize={40} minSize={20} className="min-h-0">
            <section className="flex h-full min-h-0 flex-col">
              <div className="border-b border-[color:var(--border-subtle)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Schema</p>
                <h2 className="mt-2 text-lg font-semibold">Describe the architecture</h2>
              </div>

              <div className="min-h-0 flex-1 bg-[color:var(--code-bg)]">
                <Editor
                  height="100%"
                  language="vrd"
                  theme={resolvedTheme === "dark" ? "verdant-dark" : "verdant-light"}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  onMount={(editorInstance) => {
                    editorRef.current = editorInstance;
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "var(--font-geist-mono)",
                    padding: { top: 18, bottom: 18 },
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>

              <div className="flex items-center justify-between border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]/70 px-4 py-3 text-xs text-[color:var(--text-secondary)]">
                <div className="flex items-center gap-3">
                  <span className={parsed.error ? "font-semibold text-rose-400" : "font-semibold text-[color:var(--accent-primary)]"}>
                    {parsed.error ? "1 Error" : "0 Errors"}
                  </span>
                  <span>{code.length} chars</span>
                </div>
                <span className="max-w-[360px] truncate">{parsed.error ?? "Renderer synced"}</span>
              </div>
            </section>
          </Panel>

          <PanelResizeHandle className={isMobile ? "h-2 bg-[color:var(--border-subtle)]" : "w-2 bg-[color:var(--border-subtle)]"} />

          <Panel defaultSize={60} minSize={20} className="min-h-0">
            <section className="relative flex h-full min-h-0 flex-col">
              <div className="border-b border-[color:var(--border-subtle)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Preview</p>
                <h2 className="mt-2 text-lg font-semibold">Orbit the live scene</h2>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(82,183,136,0.18),transparent_45%)]">
                {!isRendererReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[color:var(--page-bg)]/92">
                    <Loader2 className="h-10 w-10 animate-spin text-[color:var(--accent-primary)]" />
                    <span className="text-sm text-[color:var(--text-secondary)]">Initializing WebGL scene...</span>
                  </div>
                )}

                {parsed.ast ? (
                  <VerdantRenderer ast={parsed.ast} theme={resolvedTheme} width="100%" height="100%" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                    <p className="text-lg font-semibold text-rose-400">Scene could not render</p>
                    <p className="font-mono text-sm text-[color:var(--text-secondary)]">{parsed.error}</p>
                  </div>
                )}

                <div className="pointer-events-none absolute bottom-5 right-5 hidden gap-2 sm:flex">
                  {["orbit: left click", "pan: right click", "zoom: scroll"].map((hint) => (
                    <span
                      key={hint}
                      className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]/85 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]"
                    >
                      {hint}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </Panel>
        </PanelGroup>
      </main>

      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Verdant AI</p>
                <h3 className="mt-2 text-lg font-semibold">Generate a `.vrd` starting point</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="rounded-full border border-[color:var(--border-subtle)] p-2 text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
                aria-label="Close AI modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Describe the system in plain English and Verdant will draft the schema you can refine.
              </p>

              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder='Example: "Three services behind a gateway, with Redis and Postgres."'
                className="h-36 w-full rounded-[22px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-primary)]"
                disabled={isGenerating}
              />

              {aiError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {aiError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]/70 px-5 py-4">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                disabled={isGenerating}
                className="rounded-full border border-[color:var(--border-subtle)] px-4 py-2 text-sm text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !aiPrompt.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--accent-dark),var(--accent-primary))] px-5 py-2 text-sm font-medium text-white transition hover:shadow-[0_18px_36px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {isGenerating ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




