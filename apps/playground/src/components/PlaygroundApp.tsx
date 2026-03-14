"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { parseVrdSafe, VrdParseResult, KNOWN_NODE_TYPES } from "@repo/parser";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import {
  ImageIcon,
  Loader2,
  Menu,
  Monitor,
  Moon,
  Share2,
  Sparkles,
  Sun,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";
import { useThemeMode } from "./useThemeMode";

// ── Dynamic import for R3F (no SSR) ───────────────

const VerdantRenderer = dynamic(
  () => import("@repo/renderer").then((mod) => mod.VerdantRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color:var(--page-bg)]">
        <Loader2 className="h-10 w-10 animate-spin text-[color:var(--accent-primary)]" />
        <span className="text-sm text-[color:var(--text-secondary)]">
          Loading Verdant renderer…
        </span>
      </div>
    ),
  }
);

// ── Types ──────────────────────────────────────────

type EditorMount = NonNullable<ComponentProps<typeof Editor>["onMount"]>;
type EditorInstance = Parameters<EditorMount>[0];
type MonacoInstance = Parameters<EditorMount>[1];

// ── Presets (valid .vrd syntax) ────────────────────

const PRESETS: Record<string, { label: string; description: string; code: string }> = {
  simple: {
    label: "Simple",
    description: "Simple Web Stack",
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
    description: "Microservices Architecture",
    code: `# Microservices Architecture
theme: moss
layout: auto

gateway api-gw:
  label: "Kong API Gateway"

group backend "Backend APIs":
  service users
  service orders
  service inventory

user client

client -> api-gw: "REST"
api-gw -> backend.users: "/v1/users"
api-gw -> backend.orders: "/v1/orders"
api-gw -> backend.inventory: "/v1/inventory"`,
  },
  pipeline: {
    label: "Pipeline",
    description: "Data Pipeline",
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
warehouse -> grafana: "dashboard query"`,
  },
  fullstack: {
    label: "Full Stack",
    description: "Full Stack with Caching",
    code: `# Full Stack Architecture
theme: fern
layout: auto

user client:
  label: "Browser"

gateway cdn:
  label: "CDN / Edge"

server api:
  label: "API Server"
  size: lg

database postgres:
  label: "PostgreSQL"
  glow: true

cache redis:
  label: "Redis Cache"

queue events:
  label: "Event Queue"

monitor grafana:
  label: "Grafana"

client -> cdn: "HTTPS"
cdn -> api: "origin"
api -> postgres: "reads/writes"
api -> redis: "cache"
api -> events: "publish"
events -> grafana: "metrics"`,
  },
};

// ── Known tokens for autocomplete ──────────────────

const NODE_TYPES = [...KNOWN_NODE_TYPES];
const CONFIG_KEYS = ["theme", "layout", "camera", "pack"];
const PROP_KEYS = ["label", "color", "size", "glow", "icon", "position"];
const THEME_VALUES = [
  "moss", "sage", "fern", "bloom", "ash",
  "dusk", "stone", "ember", "frost", "canopy",
];
const LAYOUT_VALUES = ["auto", "grid", "circular"];
const CAMERA_VALUES = ["perspective", "orthographic"];
const SIZE_VALUES = ["sm", "md", "lg", "xl"];
const STYLE_VALUES = ["solid", "dashed", "animated", "dotted"];
const BOOL_VALUES = ["true", "false"];

// ── Component ──────────────────────────────────────

export function PlaygroundApp() {
  const [code, setCode] = useState(PRESETS.simple.code);
  const [isMobile, setIsMobile] = useState(false);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [mobilePresetOpen, setMobilePresetOpen] = useState(false);
  const editorRef = useRef<EditorInstance | null>(null);
  const monaco = useMonaco() as MonacoInstance | null;
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");

  // ── Parse with diagnostics ───────────────────────

  const parseResult = useMemo<VrdParseResult>(() => {
    return parseVrdSafe(code);
  }, [code]);

  const errorCount = useMemo(
    () => parseResult.diagnostics.filter((d) => d.severity === "error").length,
    [parseResult.diagnostics]
  );

  const warningCount = useMemo(
    () => parseResult.diagnostics.filter((d) => d.severity === "warning").length,
    [parseResult.diagnostics]
  );

  // ── Share link from URL hash ─────────────────────

  useEffect(() => {
    if (window.location.hash) {
      try {
        const decoded = atob(window.location.hash.slice(1));
        if (decoded.trim()) setCode(decoded);
      } catch {
        console.warn("Invalid share link");
      }
    }
    const timer = window.setTimeout(() => setIsRendererReady(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  // ── Responsive ───────────────────────────────────

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Monaco Language Setup ────────────────────────

  useEffect(() => {
    if (!monaco) return;
    if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === "vrd")) return;

    // Register language
    monaco.languages.register({ id: "vrd" });

    // Syntax highlighting (Monarch)
    monaco.languages.setMonarchTokensProvider("vrd", {
      keywords: NODE_TYPES,
      configs: CONFIG_KEYS,
      properties: PROP_KEYS,
      tokenizer: {
        root: [
          [/#.*$/, "comment"],
          [/\bgroup\b/, "keyword.group"],
          [
            new RegExp(`\\b(${NODE_TYPES.join("|")})\\b`),
            "keyword",
          ],
          [
            new RegExp(`\\b(${CONFIG_KEYS.join("|")})\\b`),
            "config",
          ],
          [
            new RegExp(`\\b(${PROP_KEYS.join("|")})\\b`),
            "property",
          ],
          [/->/, "operator.arrow"],
          [/:/, "delimiter"],
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/'/, "string", "@stringSingle"],
          [/\b(true|false)\b/, "constant"],
          [/#[0-9a-fA-F]{3,8}\b/, "number.hex"],
          [/\b\d+(\.\d+)?\b/, "number"],
        ],
        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],
        stringSingle: [
          [/[^\\']+/, "string"],
          [/\\./, "string.escape"],
          [/'/, "string", "@pop"],
        ],
      },
    });

    // ── Autocomplete / IntelliSense ────────────────

    monaco.languages.registerCompletionItemProvider("vrd", {
      triggerCharacters: [" ", ":", "\n"],
      provideCompletionItems: (model: any, position: any) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1).trimStart();
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];

        // Empty line or start of line → component types + config + group
        if (textBeforeCursor === "" || textBeforeCursor === word.word) {
          // Node types
          NODE_TYPES.forEach((type) => {
            suggestions.push({
              label: type,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: `${type} `,
              detail: "Component type",
              range,
            });
          });

          // Group
          suggestions.push({
            label: "group",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'group ${1:id} "${2:Label}":\n  ',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Group block",
            range,
          });

          // Config keys
          CONFIG_KEYS.forEach((key) => {
            suggestions.push({
              label: key,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: `${key}: `,
              detail: "Config",
              range,
            });
          });

          return { suggestions };
        }

        // After a node ID + space → suggest "->"
        const nodeLineMatch = textBeforeCursor.match(
          new RegExp(`^(${NODE_TYPES.join("|")})\\s+[\\w-]+\\s+$`)
        );
        if (nodeLineMatch || /^[\w.-]+\s+$/.test(textBeforeCursor)) {
          suggestions.push({
            label: "->",
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: "-> ",
            detail: "Create connection",
            range,
          });
        }

        // After "->" → suggest existing node IDs
        if (textBeforeCursor.includes("->")) {
          const allLines = model.getValue().split("\n");
          const nodeIds = new Set<string>();

          allLines.forEach((line: string) => {
            const trimmed = line.trim();
            const nodeMatch = trimmed.match(
              new RegExp(`^(${NODE_TYPES.join("|")})\\s+([\\w-]+)`)
            );
            if (nodeMatch) nodeIds.add(nodeMatch[2]);
          });

          nodeIds.forEach((id) => {
            suggestions.push({
              label: id,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: id,
              detail: "Node ID",
              range,
            });
          });
        }

        // Indented line → property keys
        if (/^\s+/.test(lineContent) && !textBeforeCursor.includes(":")) {
          PROP_KEYS.forEach((prop) => {
            suggestions.push({
              label: prop,
              kind: monaco.languages.CompletionItemKind.Property,
              insertText: `${prop}: `,
              detail: "Property",
              range,
            });
          });
        }

        // After "theme:" → theme values
        if (/theme:\s*/.test(textBeforeCursor)) {
          THEME_VALUES.forEach((v) => {
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              detail: "Theme",
              range,
            });
          });
        }

        // After "layout:" → layout values
        if (/layout:\s*/.test(textBeforeCursor)) {
          LAYOUT_VALUES.forEach((v) => {
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            });
          });
        }

        // After "camera:" → camera values
        if (/camera:\s*/.test(textBeforeCursor)) {
          CAMERA_VALUES.forEach((v) => {
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            });
          });
        }

        // After "size:" → size values
        if (/size:\s*/.test(textBeforeCursor)) {
          SIZE_VALUES.forEach((v) => {
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            });
          });
        }

        // After "style:" → style values
        if (/style:\s*/.test(textBeforeCursor)) {
          STYLE_VALUES.forEach((v) => {
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            });
          });
        }

        // After "glow:" → boolean
        if (/glow:\s*/.test(textBeforeCursor)) {
          BOOL_VALUES.forEach((v) => {
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText: v,
              range,
            });
          });
        }

        return { suggestions };
      },
    });

    // ── Editor Themes ──────────────────────────────

    monaco.editor.defineTheme("verdant-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "52B788", fontStyle: "bold" },
        { token: "keyword.group", foreground: "52B788", fontStyle: "bold" },
        { token: "operator.arrow", foreground: "FFFFFF", fontStyle: "bold" },
        { token: "delimiter", foreground: "6B7280" },
        { token: "property", foreground: "74C69D" },
        { token: "config", foreground: "95D5B2", fontStyle: "bold" },
        { token: "string", foreground: "B7E4C7" },
        { token: "string.escape", foreground: "D8F3DC" },
        { token: "string.invalid", foreground: "F87171" },
        { token: "comment", foreground: "4A6E5C", fontStyle: "italic" },
        { token: "constant", foreground: "FDE68A" },
        { token: "number", foreground: "FDE68A" },
        { token: "number.hex", foreground: "C4B5FD" },
      ],
      colors: {
        "editor.background": "#0D1F17",
        "editor.foreground": "#D8F3DC",
        "editorLineNumber.foreground": "#4A6E5C",
        "editorLineNumber.activeForeground": "#52B788",
        "editor.selectionBackground": "#2D6A4F44",
        "editor.lineHighlightBackground": "#1A332811",
        "editorCursor.foreground": "#52B788",
        "editorSuggestWidget.background": "#0D1F17",
        "editorSuggestWidget.border": "#1A3328",
        "editorSuggestWidget.selectedBackground": "#1A3328",
      },
    });

    monaco.editor.defineTheme("verdant-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "2D6A4F", fontStyle: "bold" },
        { token: "keyword.group", foreground: "2D6A4F", fontStyle: "bold" },
        { token: "operator.arrow", foreground: "111827", fontStyle: "bold" },
        { token: "delimiter", foreground: "9CA3AF" },
        { token: "property", foreground: "40916C" },
        { token: "config", foreground: "2D6A4F", fontStyle: "bold" },
        { token: "string", foreground: "5F8F75" },
        { token: "comment", foreground: "7A8F80", fontStyle: "italic" },
        { token: "constant", foreground: "B45309" },
        { token: "number", foreground: "B45309" },
        { token: "number.hex", foreground: "7C3AED" },
      ],
      colors: {
        "editor.background": "#F0FDF4",
        "editor.foreground": "#17311F",
        "editorLineNumber.foreground": "#7A8F80",
        "editorLineNumber.activeForeground": "#2D6A4F",
        "editor.selectionBackground": "#2D6A4F22",
        "editorCursor.foreground": "#2D6A4F",
      },
    });
  }, [monaco]);

  // ── Theme switching ──────────────────────────────

  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(
        resolvedTheme === "dark" ? "verdant-dark" : "verdant-light"
      );
    }
  }, [monaco, resolvedTheme]);

  // ── Monaco error markers (all diagnostics) ───────

  useEffect(() => {
    if (!monaco || !editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = parseResult.diagnostics
      .filter((d) => d.line > 0) // skip post-parse validation (line=0)
      .map((d) => ({
        startLineNumber: d.line,
        startColumn: 1,
        endLineNumber: d.line,
        endColumn: model.getLineLength(d.line) + 1,
        message: d.message,
        severity:
          d.severity === "error"
            ? monaco.MarkerSeverity.Error
            : d.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
      }));

    monaco.editor.setModelMarkers(model, "verdant", markers);
  }, [monaco, parseResult.diagnostics, code]);

  // ── Toast on errors ──────────────────────────────

  useEffect(() => {
    if (errorCount === 0) {
      toast.dismiss("vrd-error");
      return;
    }

    const firstError = parseResult.diagnostics.find((d) => d.severity === "error");
    const timer = window.setTimeout(() => {
      toast.error(`Syntax Error: ${firstError?.message}`, { id: "vrd-error" });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [errorCount, parseResult.diagnostics]);

  // ── AI Generation ────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    setAiError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = (await response.json()) as {
        code?: string;
        error?: string;
      };

      if (!response.ok || !data.code) {
        throw new Error(data.error || "Generation failed");
      }

      setCode(data.code);
      setIsAiModalOpen(false);
      setAiPrompt("");
      toast.success("Architecture generated");
    } catch (error: unknown) {
      setAiError(
        error instanceof Error ? error.message : "Generation failed"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt]);

  // ── Share ────────────────────────────────────────

  const handleShare = useCallback(async () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(code)));
      const url = new URL(window.location.href);
      url.hash = encoded;
      window.history.replaceState(null, "", url.toString());
      await navigator.clipboard.writeText(url.toString());
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Could not create share link");
    }
  }, [code]);

  // ── Export PNG ───────────────────────────────────

  const handleExportPNG = useCallback(() => {
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
  }, []);

  // ── Derived styles ───────────────────────────────

  const buttonClass =
    "inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[color:var(--accent-primary)]/30";

  // ── Status bar text ──────────────────────────────

  const statusText = useMemo(() => {
    if (errorCount > 0) return `${errorCount} error${errorCount > 1 ? "s" : ""}`;
    if (warningCount > 0) return `${warningCount} warning${warningCount > 1 ? "s" : ""}`;
    return "0 errors";
  }, [errorCount, warningCount]);

  const statusColor = errorCount > 0
    ? "text-rose-400"
    : warningCount > 0
    ? "text-amber-400"
    : "text-[color:var(--accent-primary)]";

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--page-bg)] text-[color:var(--text-primary)]">
      {/* ── Header ─────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--border-subtle)] bg-[color:var(--page-bg)]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[radial-gradient(circle_at_top,rgba(82,183,136,0.28),transparent_65%)]">
              <Sparkles className="h-5 w-5 text-[color:var(--accent-primary)]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Verdant
              </p>
              <h1 className="text-lg font-semibold">Playground</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile preset selector */}
            <button
              type="button"
              onClick={() => setMobilePresetOpen(!mobilePresetOpen)}
              className={`${buttonClass} lg:hidden`}
              aria-label="Open examples"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className={buttonClass}
            >
              <Wand2 className="h-4 w-4 text-[color:var(--accent-primary)]" />
              <span className="hidden sm:inline">AI</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className={buttonClass}
              aria-label="Copy share link"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              type="button"
              onClick={handleExportPNG}
              className={buttonClass}
              aria-label="Export diagram as PNG"
            >
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">PNG</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (themeMode === "system") {
                  setThemeMode(resolvedTheme === "dark" ? "light" : "dark");
                } else {
                  setThemeMode(themeMode === "dark" ? "light" : "dark");
                }
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] transition hover:-translate-y-0.5"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile preset dropdown */}
        {mobilePresetOpen && (
          <div className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-4 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCode(preset.code);
                    setMobilePresetOpen(false);
                  }}
                  className={`rounded-xl border p-3 text-left text-sm transition ${
                    preset.code === code
                      ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-glow)]"
                      : "border-[color:var(--border-subtle)]"
                  }`}
                >
                  <span className="font-medium">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Main ───────────────────────────────── */}
      <main className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]/70 p-4 lg:flex lg:flex-col">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
              Examples
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Swap in a preset, tweak the schema, watch the scene update.
            </p>
          </div>

          <div className="space-y-2">
            {Object.entries(PRESETS).map(([key, preset]) => {
              const isActive = preset.code === code;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCode(preset.code)}
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                    isActive
                      ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-glow)] text-[color:var(--text-primary)]"
                      : "border-transparent text-[color:var(--text-secondary)] hover:border-[color:var(--border-subtle)] hover:bg-[color:var(--surface)]",
                  ].join(" ")}
                >
                                    <span className="block font-medium text-[color:var(--text-primary)]">
                    {preset.label}
                  </span>
                  <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-6 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              Shortcuts
            </p>
            <div className="mt-3 space-y-2 text-xs text-[color:var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Save</span>
                <kbd className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘S
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Format</span>
                <kbd className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 font-mono text-[10px]">
                  ⇧⌥F
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Autocomplete</span>
                <kbd className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] px-1.5 py-0.5 font-mono text-[10px]">
                  ⌃Space
                </kbd>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          </div>
        </aside>

        {/* ── Editor + Preview Panels ────────── */}
        <PanelGroup orientation={isMobile ? "vertical" : "horizontal"}>
          {/* Editor Panel */}
          <Panel defaultSize={40} minSize={20} className="min-h-0">
            <section className="flex h-full min-h-0 flex-col">
              <div className="border-b border-[color:var(--border-subtle)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Schema
                </p>
                <h2 className="mt-2 text-lg font-semibold">
                  Describe the architecture
                </h2>
              </div>

              <div className="min-h-0 flex-1 bg-[color:var(--code-bg)]">
                <Editor
                  height="100%"
                  language="vrd"
                  theme={
                    resolvedTheme === "dark"
                      ? "verdant-dark"
                      : "verdant-light"
                  }
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  onMount={(editorInstance) => {
                    editorRef.current = editorInstance;

                    // Keyboard shortcut: Ctrl/Cmd+S → prevent default
                    editorInstance.addCommand(
                      monaco!.KeyMod.CtrlCmd | monaco!.KeyCode.KeyS,
                      () => {
                        toast.success("Auto-saved (diagrams sync live)");
                      }
                    );
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "var(--font-mono)",
                    fontLigatures: true,
                    padding: { top: 18, bottom: 18 },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    renderLineHighlight: "line",
                    bracketPairColorization: { enabled: false },
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    tabSize: 2,
                    wordWrap: "on",
                    suggest: {
                      showKeywords: true,
                      showSnippets: true,
                      preview: true,
                    },
                    quickSuggestions: {
                      other: true,
                      comments: false,
                      strings: false,
                    },
                  }}
                />
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]/70 px-4 py-3 text-xs text-[color:var(--text-secondary)]">
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${statusColor}`}>
                    {statusText}
                  </span>
                  {warningCount > 0 && errorCount === 0 && (
                    <span className="font-semibold text-amber-400">
                      {warningCount} warning{warningCount > 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-[color:var(--text-muted)]">
                    {code.split("\n").length} lines · {code.length} chars
                  </span>
                </div>
                <span className="max-w-[360px] truncate">
                  {errorCount > 0
                    ? parseResult.diagnostics.find(
                        (d) => d.severity === "error"
                      )?.message
                    : warningCount > 0
                    ? parseResult.diagnostics.find(
                        (d) => d.severity === "warning"
                      )?.message
                    : "✓ Renderer synced"}
                </span>
              </div>
            </section>
          </Panel>

          <PanelResizeHandle
            className={
              isMobile
                ? "flex h-3 items-center justify-center bg-[color:var(--surface-soft)]"
                : "flex w-3 items-center justify-center bg-[color:var(--surface-soft)]"
            }
          >
            <div
              className={
                isMobile
                  ? "h-1 w-8 rounded-full bg-[color:var(--border-subtle)]"
                  : "h-8 w-1 rounded-full bg-[color:var(--border-subtle)]"
              }
            />
          </PanelResizeHandle>

          {/* Preview Panel */}
          <Panel defaultSize={60} minSize={20} className="min-h-0">
            <section className="relative flex h-full min-h-0 flex-col">
              <div className="border-b border-[color:var(--border-subtle)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Preview
                </p>
                <h2 className="mt-2 text-lg font-semibold">
                  Orbit the live scene
                </h2>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(82,183,136,0.18),transparent_45%)]">
                {/* Loading overlay */}
                {!isRendererReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[color:var(--page-bg)]/92">
                    <Loader2 className="h-10 w-10 animate-spin text-[color:var(--accent-primary)]" />
                    <span className="text-sm text-[color:var(--text-secondary)]">
                      Initializing WebGL scene…
                    </span>
                  </div>
                )}

                {/* R3F Scene or Error */}
                {parseResult.ast.nodes.length > 0 ||
                parseResult.ast.edges.length > 0 ? (
                  <R3FErrorBoundary>
                    <VerdantRenderer
                      ast={parseResult.ast}
                      theme={resolvedTheme}
                      width="100%"
                      height="100%"
                    />
                  </R3FErrorBoundary>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    {errorCount > 0 ? (
                      <>
                        <p className="text-lg font-semibold text-rose-400">
                          Scene could not render
                        </p>
                        <p className="max-w-md font-mono text-sm text-[color:var(--text-secondary)]">
                          {
                            parseResult.diagnostics.find(
                              (d) => d.severity === "error"
                            )?.message
                          }
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="h-20 w-20 rounded-full border border-[color:var(--border-subtle)] bg-[radial-gradient(circle,rgba(82,183,136,0.15),transparent_65%)]" />
                        <p className="text-sm text-[color:var(--text-secondary)]">
                          Add some nodes to see the scene
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Control hints */}
                <div className="pointer-events-none absolute bottom-5 right-5 hidden gap-2 sm:flex">
                  {[
                    "orbit: drag",
                    "pan: right-drag",
                    "zoom: scroll",
                  ].map((hint) => (
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

      {/* ── AI Modal ───────────────────────────── */}
      {isAiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAiModalOpen(false);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Verdant AI
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  Generate a <code className="font-mono text-[color:var(--accent-primary)]">.vrd</code> starting point
                </h3>
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
                Describe the system in plain English. Verdant will draft the
                schema — you can refine it after.
              </p>

              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleGenerate();
                  }
                }}
                placeholder='e.g. "Three microservices behind a gateway, with Redis caching and Postgres"'
                className="h-36 w-full rounded-[22px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--accent-primary)] resize-none"
                disabled={isGenerating}
                autoFocus
              />

              {aiError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {aiError}
                </div>
              )}

              <p className="text-xs text-[color:var(--text-muted)]">
                Tip: Press <kbd className="rounded border border-[color:var(--border-subtle)] px-1 py-0.5 font-mono text-[10px]">⌘↵</kbd> to generate
              </p>
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
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {isGenerating ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// R3F Error Boundary
// ═══════════════════════════════════════════════════

import React from "react";

interface R3FErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class R3FErrorBoundary extends React.Component<
  { children: React.ReactNode },
  R3FErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): R3FErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Verdant Renderer Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="renderer-error-fallback">
          <p className="text-lg font-semibold text-rose-400">
            Renderer crashed
          </p>
          <p className="max-w-md font-mono text-sm">
            {this.state.error?.message || "Unknown WebGL error"}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-full border border-[color:var(--border-subtle)] px-4 py-2 text-sm transition hover:bg-[color:var(--surface-soft)]"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}