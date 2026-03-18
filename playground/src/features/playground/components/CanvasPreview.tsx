"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { R3FErrorBoundary } from "./R3FErrorBoundary";
import type { CameraData } from "@repo/renderer";

const VerdantRenderer = dynamic(
  () => 
    import("@repo/renderer")
      .then((mod) => mod.VerdantRenderer)
      .catch((err) => {
        console.error("Failed to load VerdantRenderer:", err);
        throw err;
      }),
  {
    ssr: false,
    loading: () => null,
  },
);

interface CanvasPreviewProps {
  isRendererReady: boolean;
  hasContent: boolean;
  ast: any;
  resolvedTheme: "light" | "dark";
  errorCount: number;
  onNodeClick?: (info: { nodeId: string; screenX: number; screenY: number }) => void;
  onCameraChange?: (data: CameraData) => void;
  selectedNodeId?: string | null;
  onOpenSchema?: () => void;
}

export function CanvasPreview({
  isRendererReady,
  hasContent,
  ast,
  resolvedTheme,
  errorCount,
  onNodeClick,
  onCameraChange,
  selectedNodeId,
  onOpenSchema,
}: CanvasPreviewProps) {
  return (
    <div className="pg-canvas">
      {/* Loader */}
      {!isRendererReady && (
        <div className="pg-canvas-loader">
          <Loader2
            style={{
              width: 24,
              height: 24,
              animation: "spin 1s linear infinite",
              color: "var(--accent)",
            }}
          />
          <span
            style={{
              marginTop: "0.75rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
            }}
          >
            initializing scene
          </span>
        </div>
      )}

      {/* 3D Scene or Empty State */}
      {hasContent ? (
        <R3FErrorBoundary>
          <VerdantRenderer
            ast={ast}
            theme={resolvedTheme}
            width="100%"
            height="100%"
            autoRotate
            onNodeClick={onNodeClick}
            onCameraChange={onCameraChange}
            selectedNodeId={selectedNodeId}
          />
        </R3FErrorBoundary>
      ) : (
        <div className="pg-empty">
          <span className="pg-empty-title">
            {errorCount > 0 ? "Syntax needs fixing." : "Write something."}
          </span>
          <span className="pg-empty-desc">
            {errorCount > 0
              ? "Check the schema panel for errors — fix them and your diagram will appear."
              : "Open the schema panel and describe your system in .vrd syntax. Nodes and edges will render here instantly."}
          </span>
          {!errorCount && onOpenSchema && (
            <div className="btn-group" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenSchema}
                style={{ fontSize: "0.75rem", padding: "0.5rem 1rem" }}
              >
                Open schema
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onOpenSchema}
                style={{ fontSize: "0.75rem", padding: "0.5rem 0.75rem" }}
              >
                ◁
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}