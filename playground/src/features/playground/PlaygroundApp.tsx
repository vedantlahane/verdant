"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CameraData, CursorData } from "@verdant/renderer";

import { usePlaygroundState } from "./hooks/usePlaygroundState";
import { useAiGeneration } from "./hooks/useAiGeneration";
import { useShareUrl } from "./hooks/useShareUrl";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMonacoLanguage } from "./hooks/useMonacoLanguage";
import { useMonacoMarkers } from "./hooks/useMonacoMarkers";
import { useMonacoTheme } from "./hooks/useMonacoTheme";
import { PlaygroundProvider } from "./context/PlaygroundContext";

import { CanvasPreview } from "./components/CanvasPreview";
import { SchemaPanel } from "./components/SchemaPanel";
import { TopBar } from "./components/TopBar";
import { NodeInspector } from "./components/NodeInspector";
import { AxisGizmo } from "./components/AxisGizmo";
import { StatusBar } from "./components/StatusBar";
import { Editor, EditorInstance } from "./components/Editor";

export function PlaygroundApp() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const state = usePlaygroundState();
  const editorRef = useRef<EditorInstance | null>(null);
  const presetsRef = useRef<HTMLDivElement | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);

  // ── AI ──
  const ai = useAiGeneration({
    code: state.code,
    setCode: state.setCode,
    setActivePreset: (p) => {
      // Can't directly call selectPreset here because it also sets code
      // Just clear the preset indicator
    },
    setSchemaTab: state.setSchemaTab,
  });

  // ── Share URL ──
  const { shareCurrentCode } = useShareUrl(
    state.setCode,
    () => { }, // setActivePreset on load from URL
  );

  const handleShare = useCallback(
    () => shareCurrentCode(state.code),
    [shareCurrentCode, state.code],
  );

  // ── Export PNG ──
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

  // ── Monaco ──
  const monaco = useMonacoLanguage();
  useMonacoTheme(monaco, state.resolvedTheme);
  useMonacoMarkers(monaco, editorRef, state.parseResult);

  // ── Keyboard shortcuts ──
  useKeyboardShortcuts({
    inspectorTarget: state.inspectorTarget,
    setInspectorTarget: state.setInspectorTarget,
    schemaOpen: state.schemaOpen,
    setSchemaOpen: state.setSchemaOpen,
    setSchemaTab: state.setSchemaTab,
    exportPng: handleExportPNG,
    toggleCoordinateSystem: state.toggleCoordinateSystem,
  });

  // ── Node click ──
  const handleNodeClick = useCallback(
    (info: { nodeId: string; screenX: number; screenY: number }) => {
      state.setInspectorTarget(info);
    },
    [state.setInspectorTarget],
  );

  // ── Stable camera/cursor callbacks ──
  const handleCameraChange = useCallback(
    (data: CameraData) => state.setCameraData(data),
    [state.setCameraData],
  );

  const handleCursorMove = useCallback(
    (data: CursorData | null) => state.setCursorData(data),
    [state.setCursorData],
  );

  const hasContent = state.nodeCount > 0 || state.edgeCount > 0;

  if (!isMounted) return null;

  return (
    <PlaygroundProvider value={state}>
      <div className="pg-root">
        {/* Layer 0: 3D Canvas */}
        <CanvasPreview
          isRendererReady={state.isRendererReady}
          hasContent={hasContent}
          ast={state.parseResult.ast}
          resolvedTheme={state.resolvedTheme}
          errorCount={state.errorCount}
          showCoordinateSystem={state.showCoordinateSystem}
          onNodeClick={handleNodeClick}
          onCameraChange={handleCameraChange}
          onCursorMove={handleCursorMove}
          selectedNodeId={state.inspectorTarget?.nodeId ?? null}
          onOpenSchema={() => {
            state.setSchemaOpen(true);
            state.setSchemaTab("code");
          }}
        />

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

        {/* Layer 3: Axis Gizmo */}
        {state.showCoordinateSystem && (
          <div className="pg-axis-gizmo" aria-hidden="true">
            <AxisGizmo cameraData={state.cameraData} />
          </div>
        )}

        {/* Layer 4: Top Bar */}
        <TopBar
          onShareClick={handleShare}
          onExportPngClick={handleExportPNG}
          onThemeToggle={state.toggleTheme}
          resolvedTheme={state.resolvedTheme}
        />

        {/* Layer 5: Schema Panel */}
        <SchemaPanel
          open={state.schemaOpen}
          onOpenChange={state.setSchemaOpen}
          activeTab={state.schemaTab}
          onTabChange={state.setSchemaTab}
          errorCount={state.errorCount}
          warningCount={state.warningCount}
          nodeCount={state.nodeCount}
          edgeCount={state.edgeCount}
          presetsOpen={presetsOpen}
          onPresetsOpenChange={setPresetsOpen}
          activePreset={state.activePreset}
          onSelectPreset={state.selectPreset}
          presetsRef={presetsRef}
          aiPrompt={ai.aiPrompt}
          onAiPromptChange={ai.setAiPrompt}
          onAiApply={ai.applyAi}
          isGenerating={ai.isGenerating}
          aiError={ai.aiError}
          aiHistory={ai.aiHistory}
          onAiUndo={ai.undoAi}
          editorChildren={
            <Editor
              code={state.code}
              onChange={(val) => state.setCode(val ?? "")}
              onMount={(editor) => { editorRef.current = editor; }}
              theme={state.resolvedTheme}
            />
          }
        />

        {/* Layer 6: Node Inspector */}
        {state.inspectorTarget && (
          <NodeInspector
            target={state.inspectorTarget}
            ast={state.parseResult.ast}
            onClose={() => state.setInspectorTarget(null)}
            onNavigateNode={(nodeId) => {
              const current = state.inspectorTarget;
              state.setInspectorTarget(
                current ? { ...current, nodeId } : null,
              );
            }}
          />
        )}

        {/* Layer 7: Status Bar */}
        <StatusBar />
      </div>
    </PlaygroundProvider>
  );
}