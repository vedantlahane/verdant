"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseVrdSafe, VrdParseResult } from "@repo/parser";
import { toast } from "sonner";
import { useThemeMode } from "@/features/shared/hooks/useThemeMode";

import { PRESETS } from "@/features/playground/constants";
import { useMonacoSetup } from "@/features/playground/hooks/useMonacoSetup";
import { Editor, EditorInstance } from "@/features/playground/components/Editor";
import { TopBar } from "@/features/playground/components/TopBar";
import { SchemaPanel } from "@/features/playground/components/SchemaPanel";
import { CanvasPreview } from "@/features/playground/components/CanvasPreview";
import { NodeInspector } from "@/features/playground/components/NodeInspector";

/* ── AI history entry ── */
export interface AiHistoryEntry {
  id: string;
  prompt: string;
  codeBefore: string;
  codeAfter: string;
  nodesBefore: number;
  edgesBefore: number;
  nodesAfter: number;
  edgesAfter: number;
  timestamp: number;
}

/* ── Inspector target ── */
export interface InspectorTarget {
  nodeId: string;
  screenX: number;
  screenY: number;
}

export function PlaygroundApp() {
  // ── Core state ──
  const [code, setCode] = useState(PRESETS.simple.code);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [schemaTab, setSchemaTab] = useState<"code" | "ai">("code");
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("simple");
  const [isRendererReady, setIsRendererReady] = useState(false);

  // ── AI state ──
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiHistory, setAiHistory] = useState<AiHistoryEntry[]>([]);

  // ── Inspector state ──
  const [inspectorTarget, setInspectorTarget] =
    useState<InspectorTarget | null>(null);

  // ── Refs ──
  const editorRef = useRef<EditorInstance | null>(null);
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");
  const presetsRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Parse ──
  const parseResult = useMemo<VrdParseResult>(
    () => parseVrdSafe(code),
    [code],
  );

  const nodeCount = parseResult.ast.nodes.length;
  const edgeCount = parseResult.ast.edges.length;

  const errorCount = useMemo(
    () => parseResult.diagnostics.filter((d) => d.severity === "error").length,
    [parseResult.diagnostics],
  );

  const warningCount = useMemo(
    () =>
      parseResult.diagnostics.filter((d) => d.severity === "warning").length,
    [parseResult.diagnostics],
  );

  // ── Init ──
  useEffect(() => {
    if (window.location.hash) {
      try {
        const decoded = decodeURIComponent(
          escape(atob(window.location.hash.slice(1))),
        );
        if (decoded.trim()) {
          setCode(decoded);
          setActivePreset("");
        }
      } catch {
        console.warn("Invalid share link");
      }
    }
    const t = setTimeout(() => setIsRendererReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Close presets on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        presetsRef.current &&
        !presetsRef.current.contains(e.target as Node)
      ) {
        setPresetsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (e.key === "Escape") {
        if (inspectorTarget) setInspectorTarget(null);
        else if (presetsOpen) setPresetsOpen(false);
        return;
      }

      if (mod && e.key === "b") {
        e.preventDefault();
        setSchemaOpen((o) => !o);
        return;
      }

      if (mod && e.key === "k") {
        e.preventDefault();
        setSchemaOpen(true);
        setSchemaTab("ai");
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inspectorTarget, presetsOpen]);

  // ── Monaco setup ──
  useMonacoSetup(editorRef, resolvedTheme ?? "dark", parseResult, code);

  // ── AI Apply ──
  const handleAiApply = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError("");

    const codeBefore = code;
    const nBefore = parseVrdSafe(codeBefore).ast.nodes.length;
    const eBefore = parseVrdSafe(codeBefore).ast.edges.length;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, currentCode: code }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code)
        throw new Error(data.error || "Generation failed");

      const codeAfter = data.code;
      const parsed = parseVrdSafe(codeAfter);

      setCode(codeAfter);
      setActivePreset("");
      setSchemaTab("code");

      setAiHistory((prev) => [
        {
          id: crypto.randomUUID(),
          prompt: aiPrompt.trim(),
          codeBefore,
          codeAfter,
          nodesBefore: nBefore,
          edgesBefore: eBefore,
          nodesAfter: parsed.ast.nodes.length,
          edgesAfter: parsed.ast.edges.length,
          timestamp: Date.now(),
        },
        ...prev,
      ]);

      setAiPrompt("");
      toast.success("Schema updated");
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, code]);

  // ── AI Undo ──
  const handleAiUndo = useCallback(
    (entryId: string) => {
      const idx = aiHistory.findIndex((h) => h.id === entryId);
      if (idx === -1) return;
      const entry = aiHistory[idx];
      setCode(entry.codeBefore);
      setAiHistory((prev) => prev.filter((_, i) => i > idx - 1).slice(1));
      toast.success("Reverted to previous state");
    },
    [aiHistory],
  );

  // ── Other actions ──
  const handleShare = useCallback(async () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(code)));
      const url = new URL(window.location.href);
      url.hash = encoded;
      window.history.replaceState(null, "", url.toString());
      await navigator.clipboard.writeText(url.toString());
      toast.success("Share link copied");
    } catch {
      toast.error("Could not create share link");
    }
  }, [code]);

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      toast.error("No canvas found");
      return;
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "verdant-diagram.png";
    a.click();
    toast.success("PNG exported");
  }, []);

  const selectPreset = useCallback((key: string) => {
    setCode(PRESETS[key].code);
    setActivePreset(key);
    setPresetsOpen(false);
    setSchemaTab("code");
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(
      themeMode === "system"
        ? resolvedTheme === "dark"
          ? "light"
          : "dark"
        : themeMode === "dark"
          ? "light"
          : "dark",
    );
  }, [themeMode, resolvedTheme, setThemeMode]);

  // ── Node click from renderer ──
  const handleNodeClick = useCallback(
    (info: { nodeId: string; screenX: number; screenY: number }) => {
      setInspectorTarget(info);
    },
    [],
  );

  // ── Derived ──
  const hasContent = nodeCount > 0 || edgeCount > 0;

  if (!isMounted) return null;

    return (
    <div className="pg-root">
      {/* Layer 0: Full-screen 3D canvas */}
      <CanvasPreview
        isRendererReady={isRendererReady}
        hasContent={hasContent}
        ast={parseResult.ast}
        resolvedTheme={(resolvedTheme as "light" | "dark") ?? "dark"}
        errorCount={errorCount}
        onNodeClick={handleNodeClick}
        onOpenSchema={() => {
          setSchemaOpen(true);
          setSchemaTab("code");
        }}
      />

      {/* Layer 1: Grid overlay */}
      <div className="pg-grid" aria-hidden="true" />

      {/* Layer 2: Gutter decorations */}
      <div className="pg-gutter pg-gutter--left" aria-hidden="true">
        <div className="crosshair crosshair-pulse" />
        <div className="gutter-coord">00</div>
        <div className="gutter-mark" style={{ height: 24 }} />
        <div className="gutter-dot" />
        <div className="gutter-coord">01</div>
        <div className="gutter-mark" style={{ height: 24 }} />
        <div className="crosshair" />
      </div>
      <div className="pg-gutter pg-gutter--right" aria-hidden="true">
        <div className="crosshair" />
        <div className="gutter-coord">10</div>
        <div className="gutter-mark" style={{ height: 24 }} />
        <div className="gutter-dot" />
        <div className="gutter-coord">11</div>
        <div className="gutter-mark" style={{ height: 24 }} />
        <div className="crosshair" />
      </div>

      {/* Layer 3: Axis gizmo hint */}
      <div className="pg-axis-gizmo" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48">
          {/* X axis */}
          <line x1="24" y1="24" x2="44" y2="24" stroke="#e57373" strokeWidth="1" opacity="0.6" />
          <text x="46" y="26" fill="#e57373" fontSize="8" opacity="0.6">x</text>
          {/* Y axis */}
          <line x1="24" y1="24" x2="24" y2="4" stroke="#81c784" strokeWidth="1" opacity="0.6" />
          <text x="22" y="2" fill="#81c784" fontSize="8" opacity="0.6">y</text>
          {/* Z axis */}
          <line x1="24" y1="24" x2="10" y2="38" stroke="#64b5f6" strokeWidth="1" opacity="0.6" />
          <text x="4" y="42" fill="#64b5f6" fontSize="8" opacity="0.6">z</text>
          {/* Origin dot */}
          <circle cx="24" cy="24" r="1.5" fill="var(--text-muted)" opacity="0.5" />
        </svg>
      </div>

      {/* Layer 4: Top bar */}
      <TopBar
        onShareClick={handleShare}
        onExportPngClick={handleExportPNG}
        onThemeToggle={toggleTheme}
        resolvedTheme={(resolvedTheme as "light" | "dark") ?? "dark"}
      />

      {/* Layer 5: Schema panel */}
      <SchemaPanel
        open={schemaOpen}
        onOpenChange={setSchemaOpen}
        activeTab={schemaTab}
        onTabChange={setSchemaTab}
        errorCount={errorCount}
        warningCount={warningCount}
        nodeCount={nodeCount}
        edgeCount={edgeCount}
        presetsOpen={presetsOpen}
        onPresetsOpenChange={setPresetsOpen}
        activePreset={activePreset}
        onSelectPreset={selectPreset}
        presetsRef={presetsRef}
        aiPrompt={aiPrompt}
        onAiPromptChange={setAiPrompt}
        onAiApply={handleAiApply}
        isGenerating={isGenerating}
        aiError={aiError}
        aiHistory={aiHistory}
        onAiUndo={handleAiUndo}
        editorChildren={
          <Editor
            code={code}
            onChange={(val) => setCode(val ?? "")}
            onMount={(editor) => (editorRef.current = editor)}
            theme={resolvedTheme ?? "dark"}
          />
        }
      />

      {/* Layer 6: Node inspector */}
      {inspectorTarget && (
        <NodeInspector
          target={inspectorTarget}
          ast={parseResult.ast}
          onClose={() => setInspectorTarget(null)}
          onNavigateNode={(nodeId) => {
            setInspectorTarget((prev) =>
              prev ? { ...prev, nodeId } : null,
            );
          }}
        />
      )}

      {/* Layer 7: Bottom status bar */}
      <div className="pg-status">
        <span>
          {nodeCount}n · {edgeCount}e
          {errorCount > 0 && <> · {errorCount}⊘</>}
        </span>
        <span className="pg-status-center">
          orbit: drag · pan: right · zoom: scroll
        </span>
        <span>⌘B schema · ⌘K ai</span>
      </div>
    </div>
  );
}