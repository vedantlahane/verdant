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
import { useThemeMode } from "@/features/shared/ui/useThemeMode";

import { PRESETS } from "@/features/playground/constants";
import { useMonacoSetup } from "@/features/playground/hooks/useMonacoSetup";
import { Editor, EditorInstance } from "@/features/playground/components/Editor";
import { TopBar } from "@/features/playground/components/TopBar";
import { SchemaPanel } from "@/features/playground/components/SchemaPanel";
import { AiModal } from "@/features/playground/components/AiModal";
import { CanvasPreview } from "@/features/playground/components/CanvasPreview";

export function PlaygroundApp() {
  // ── State ────────────────────────────────────────
  const [code, setCode] = useState(PRESETS.simple.code);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("simple");
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const editorRef = useRef<EditorInstance | null>(null);
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode("dark");
  const presetsRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Parse ────────────────────────────────────────

  const parseResult = useMemo<VrdParseResult>(() => {
    return parseVrdSafe(code);
  }, [code]);

  const errorCount = useMemo(
    () => parseResult.diagnostics.filter((d) => d.severity === "error").length,
    [parseResult.diagnostics]
  );

  const warningCount = useMemo(
    () =>
      parseResult.diagnostics.filter((d) => d.severity === "warning").length,
    [parseResult.diagnostics]
  );

  // ── Init ─────────────────────────────────────────

  useEffect(() => {
    // Decode share link
    if (window.location.hash) {
      try {
        const decoded = decodeURIComponent(escape(atob(window.location.hash.slice(1))));
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

  // Close presets dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setPresetsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Monaco setup ─────────────────────────────────

  useMonacoSetup(editorRef, resolvedTheme ?? "dark", parseResult, code);

  // ── Actions ──────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) throw new Error(data.error || "Generation failed");
      setCode(data.code);
      setActivePreset("");
      setIsAiModalOpen(false);
      setAiPrompt("");
      setSchemaOpen(true);
      toast.success("Architecture generated");
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt]);

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
  }, []);

  // ── Derived ──────────────────────────────────────

  const hasContent =
    parseResult.ast.nodes.length > 0 || parseResult.ast.edges.length > 0;

  if (!isMounted) return null;

  return (
    <div className="playground-root">
      <CanvasPreview
        isRendererReady={isRendererReady}
        hasContent={hasContent}
        ast={parseResult.ast}
        resolvedTheme={(resolvedTheme as "light" | "dark") ?? "dark"}
        errorCount={errorCount}
      />

      <TopBar
        onAiClick={() => setIsAiModalOpen(true)}
        onShareClick={handleShare}
        onExportPngClick={handleExportPNG}
        onThemeToggle={() => {
          setThemeMode(
            themeMode === "system"
              ? resolvedTheme === "dark"
                ? "light"
                : "dark"
              : themeMode === "dark"
              ? "light"
              : "dark"
          );
        }}
        resolvedTheme={(resolvedTheme as "light" | "dark") ?? "dark"}
      />

      <SchemaPanel
        open={schemaOpen}
        onOpenChange={setSchemaOpen}
        errorCount={errorCount}
        warningCount={warningCount}
        presetsOpen={presetsOpen}
        onPresetsOpenChange={setPresetsOpen}
        activePreset={activePreset}
        onSelectPreset={selectPreset}
        presetsRef={presetsRef}
        editorChildren={
          <Editor
            code={code}
            onChange={(val) => setCode(val ?? "")}
            onMount={(editor) => (editorRef.current = editor)}
            theme={resolvedTheme ?? "dark"}
          />
        }
      />

      <AiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        prompt={aiPrompt}
        onPromptChange={setAiPrompt}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        error={aiError}
      />
    </div>
  );
}
