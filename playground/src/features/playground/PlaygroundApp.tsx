// features/playground/PlaygroundApp.tsx

"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import type { CameraData, CursorData, VerdantRendererHandle } from "@verdant/renderer";


import { usePlaygroundState } from "./hooks/usePlaygroundState";
import { useAiGeneration } from "./hooks/useAiGeneration";
import { useShareUrl } from "./hooks/useShareUrl";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMonacoLanguage } from "./hooks/useMonacoLanguage";
import { useMonacoMarkers } from "./hooks/useMonacoMarkers";
import { useMonacoTheme } from "./hooks/useMonacoTheme";
import { PlaygroundProvider } from "./context/PlaygroundContext";
import { toggleVrdConfigLine } from "./utils/vrdConfig";


import { CanvasPreview } from "./components/CanvasPreview";
import { SchemaPanel } from "./components/SchemaPanel";
import { TopBar } from "./components/TopBar";
import { NodeInspector } from "./components/NodeInspector";
import { AxisGizmo } from "./components/AxisGizmo";
import { StatusBar } from "./components/StatusBar";
import { Editor } from "./components/Editor";
import type { EditorInstance } from "./components/Editor";
import { KeyboardShortcutHelp } from "./components/KeyboardShortcutHelp";

// ── Frozen style constants (pattern 5) ──

const GUTTER_MARK_STYLE = Object.freeze({ height: 24 } as const) as React.CSSProperties;

// ── Stable empty callback for setActivePreset (URL load case) ──
const NOOP_SET_PRESET = () => {};

/**
 * Root playground application — orchestrates all layers:
 *
 * L0: 3D Canvas (CanvasPreview)
 * L2: Gutter decorations
 * L3: Axis gizmo
 * L4: Top bar
 * L5: Schema panel
 * L6: Node inspector
 * L7: Status bar
 * L8: Keyboard shortcut help
 */
export function PlaygroundApp() {
  // ── SSR guard ──
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const rendererRef = useRef<VerdantRendererHandle>(null);
  const state = usePlaygroundState(rendererRef);
  const editorRef = useRef<EditorInstance | null>(null);
  const presetsRef = useRef<HTMLDivElement | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);


  // ── AI ──
  const ai = useAiGeneration({
    code: state.code,
    setCode: state.setCode,
    setSchemaTab: state.setSchemaTab,
  });

  // ── Share URL ──
  const { shareCurrentCode } = useShareUrl(state.setCode, NOOP_SET_PRESET);

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
    shortcutHelpOpen,
    setShortcutHelpOpen,
  });

  // ── Stabilized callbacks for child components ──

  const handleNodeClick = useCallback(
    (info: { nodeId: string; screenX: number; screenY: number }) => {
      state.setInspectorTarget(info);
    },
    [state.setInspectorTarget],
  );

  const handleCameraChange = useCallback(
    (data: CameraData) => state.setCameraData(data),
    [state.setCameraData],
  );

  const handleCursorMove = useCallback(
    (data: CursorData | null) => state.setCursorData(data),
    [state.setCursorData],
  );

  const handleOpenSchema = useCallback(() => {
    state.setSchemaOpen(true);
    state.setSchemaTab("code");
  }, [state.setSchemaOpen, state.setSchemaTab]);

  const handleEditorChange = useCallback(
    (val: string | undefined) => state.setCode(val ?? ""),
    [state.setCode],
  );

  const handleEditorMount = useCallback(
    (editor: EditorInstance) => {
      editorRef.current = editor;
    },
    [],
  );

  const handleInspectorClose = useCallback(
    () => state.setInspectorTarget(null),
    [state.setInspectorTarget],
  );

  // Use ref for inspectorTarget to avoid re-creating this callback
  const inspectorTargetRef = useRef(state.inspectorTarget);
  inspectorTargetRef.current = state.inspectorTarget;

  const handleNavigateNode = useCallback(
    (nodeId: string) => {
      const current = inspectorTargetRef.current;
      state.setInspectorTarget(
        current ? { ...current, nodeId } : null,
      );
    },
    [state.setInspectorTarget],
  );

  const handleCloseShortcutHelp = useCallback(
    () => setShortcutHelpOpen(false),
    [],
  );

  // ── Derived state ──

  const hasContent = useMemo(
    () => state.nodeCount > 0 || state.edgeCount > 0,
    [state.nodeCount, state.edgeCount],
  );

  const selectedNodeId = state.inspectorTarget?.nodeId ?? null;

  // ── SSR bail ──
  if (!isMounted) return null;

  return (
    <PlaygroundProvider value={state}>
      <div className="pg-root">
        {/* Layer 0: 3D Canvas */}
        <CanvasPreview
          ref={rendererRef}
          isRendererReady={state.isRendererReady}
          hasContent={hasContent}
          ast={state.parseResult.ast}
          resolvedTheme={state.resolvedTheme}
          errorCount={state.errorCount}
          showCoordinateSystem={state.showCoordinateSystem}
          onNodeClick={handleNodeClick}
          onCameraChange={handleCameraChange}
          onCursorMove={handleCursorMove}
          selectedNodeId={selectedNodeId}
          onOpenSchema={handleOpenSchema}
        />


        {/* Layer 2: Gutter decorations */}
        <div className="pg-gutter pg-gutter--left" aria-hidden="true">
          <div className="crosshair crosshair-pulse" />
          <div className="gutter-coord">00</div>
          <div className="gutter-mark" style={GUTTER_MARK_STYLE} />
          <div className="gutter-dot" />
          <div className="gutter-coord">01</div>
          <div className="gutter-mark" style={GUTTER_MARK_STYLE} />
          <div className="crosshair" />
        </div>
        <div className="pg-gutter pg-gutter--right" aria-hidden="true">
          <div className="crosshair" />
          <div className="gutter-coord">10</div>
          <div className="gutter-mark" style={GUTTER_MARK_STYLE} />
          <div className="gutter-dot" />
          <div className="gutter-coord">11</div>
          <div className="gutter-mark" style={GUTTER_MARK_STYLE} />
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
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          onUndo={state.undo}
          onRedo={state.redo}
          onZoomToFit={state.zoomToFit}
          minimapEnabled={state.minimapEnabled}
          onMinimapToggle={state.toggleMinimap}
          postProcessingEnabled={state.postProcessingEnabled}
          onPostProcessingToggle={state.togglePostProcessing}
          gridSnapEnabled={state.gridSnapEnabled}
          onGridSnapToggle={state.toggleGridSnap}
          activeLayout={state.parseResult.ast.config.layout as any}
          onLayoutChange={(layout) => {
            state.setCode(toggleVrdConfigLine(state.code, "layout", layout));
          }}
          onResetCamera={state.resetCamera}
          onShortcutHelpToggle={() => setShortcutHelpOpen(true)}
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
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              theme={state.resolvedTheme}
            />
          }
        />

        {/* Layer 6: Node Inspector */}
        {state.inspectorTarget && (
          <NodeInspector
            target={state.inspectorTarget}
            ast={state.parseResult.ast}
            setCode={state.setCode}
            onClose={handleInspectorClose}
            onNavigateNode={handleNavigateNode}
          />
        )}

        {/* Layer 7: Status Bar */}
        <StatusBar />

        {/* Layer 8: Keyboard Shortcut Help overlay */}
        <KeyboardShortcutHelp
          open={shortcutHelpOpen}
          onClose={handleCloseShortcutHelp}
        />
      </div>
    </PlaygroundProvider>
  );
}