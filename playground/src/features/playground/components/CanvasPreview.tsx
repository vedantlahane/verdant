// features/playground/components/CanvasPreview.tsx

"use client";

import React, { memo } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { R3FErrorBoundary } from "./R3FErrorBoundary";
import type { VrdAST } from "@verdant/parser";
import type { CameraData, CursorData, VerdantRendererHandle } from "@verdant/renderer";


// ── Dynamic import (SSR-safe) ──

const VerdantRenderer = dynamic(
  () =>
    import("@verdant/renderer")
      .then((mod) => mod.VerdantRenderer)
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[Verdant] Failed to load renderer:", err);
        }
        throw err;
      }),
  { ssr: false, loading: () => null },
);

// ── Types ──

interface CanvasPreviewProps {
  readonly isRendererReady: boolean;
  readonly hasContent: boolean;
  readonly ast: VrdAST;
  readonly resolvedTheme: "light" | "dark";
  readonly errorCount: number;
  readonly showCoordinateSystem: boolean;
  readonly onNodeClick?: (info: { nodeId: string; screenX: number; screenY: number }) => void;
  readonly onCameraChange?: (data: CameraData) => void;
  readonly onCursorMove?: (data: CursorData | null) => void;
  readonly selectedNodeId?: string | null;
  readonly onOpenSchema?: () => void;
  readonly ref?: React.Ref<VerdantRendererHandle>;
}


interface EmptyStateProps {
  readonly errorCount: number;
  readonly onOpenSchema?: () => void;
}

// ── Frozen styles (pattern 5) ──

const LOADER_ICON_STYLE = Object.freeze({
  width: 24,
  height: 24,
  animation: "spin 1s linear infinite",
  color: "var(--accent)",
} as const) as React.CSSProperties;

const LOADER_TEXT_STYLE = Object.freeze({
  marginTop: "0.75rem",
  fontFamily: "var(--font-mono)",
  fontSize: "0.65rem",
  letterSpacing: "0.2em",
  color: "var(--text-muted)",
} as const) as React.CSSProperties;

const EMPTY_BTN_GROUP_STYLE = Object.freeze({
  marginTop: "0.5rem",
} as const) as React.CSSProperties;

const EMPTY_BTN_STYLE = Object.freeze({
  fontSize: "0.75rem",
  padding: "0.5rem 1rem",
} as const) as React.CSSProperties;

const EMPTY_BTN_SECONDARY_STYLE = Object.freeze({
  fontSize: "0.75rem",
  padding: "0.5rem 0.75rem",
} as const) as React.CSSProperties;

// ── EmptyState (memoized sub-component) ──

const EmptyState = memo(function EmptyState({
  errorCount,
  onOpenSchema,
}: EmptyStateProps) {
  const hasErrors = errorCount > 0;

  return (
    <div className="pg-empty">
      <span className="pg-empty-title">
        {hasErrors ? "Syntax needs fixing." : "Write something."}
      </span>
      <span className="pg-empty-desc">
        {hasErrors
          ? "Check the schema panel for errors — fix them and your diagram will appear."
          : "Open the schema panel and describe your system in .vrd syntax. Nodes and edges will render here instantly."}
      </span>
      {!hasErrors && onOpenSchema && (
        <div className="btn-group" style={EMPTY_BTN_GROUP_STYLE}>
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenSchema}
            style={EMPTY_BTN_STYLE}
          >
            Open schema
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onOpenSchema}
            style={EMPTY_BTN_SECONDARY_STYLE}
          >
            ◁
          </button>
        </div>
      )}
    </div>
  );
});

/**
 * 3D canvas viewport — renders the VerdantRenderer or empty state.
 *
 * Memoized with custom comparator — skips re-render unless
 * content-affecting props change.
 */
export const CanvasPreview = memo(React.forwardRef<VerdantRendererHandle, CanvasPreviewProps>(
  function CanvasPreview({
    isRendererReady,
    hasContent,
    ast,
    resolvedTheme,
    errorCount,
    showCoordinateSystem,
    onNodeClick,
    onCameraChange,
    onCursorMove,
    selectedNodeId,
    onOpenSchema,
  }, ref) {

  return (
    <div className="pg-canvas">
      {/* Loading state */}
      {!isRendererReady && (
        <div className="pg-canvas-loader">
          <Loader2 style={LOADER_ICON_STYLE} />
          <span style={LOADER_TEXT_STYLE}>initializing scene</span>
        </div>
      )}

      {/* 3D Scene or Empty State */}
      {hasContent ? (
        <R3FErrorBoundary>
          <VerdantRenderer
            ref={ref}
            ast={ast}
            theme={resolvedTheme}
            width="100%"
            height="100%"
            autoRotate
            showCoordinateSystem={showCoordinateSystem}
            onNodeClick={onNodeClick}
            onCameraChange={onCameraChange}
            onCursorMove={onCursorMove}
            selectedNodeId={selectedNodeId}
          />

        </R3FErrorBoundary>
      ) : (
        <EmptyState errorCount={errorCount} onOpenSchema={onOpenSchema} />
      )}
    </div>
  );
}),
function canvasPropsAreEqual(prev, next) {
  return (
    prev.isRendererReady === next.isRendererReady &&
    prev.hasContent === next.hasContent &&
    prev.ast === next.ast &&
    prev.resolvedTheme === next.resolvedTheme &&
    prev.errorCount === next.errorCount &&
    prev.showCoordinateSystem === next.showCoordinateSystem &&
    prev.onNodeClick === next.onNodeClick &&
    prev.onCameraChange === next.onCameraChange &&
    prev.onCursorMove === next.onCursorMove &&
    prev.selectedNodeId === next.selectedNodeId &&
    prev.onOpenSchema === next.onOpenSchema
  );
});