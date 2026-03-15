import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { R3FErrorBoundary } from "./R3FErrorBoundary";
import { VrdParseResult } from "@repo/parser";

const VerdantRenderer = dynamic(
  () => import("@repo/renderer").then((mod) => mod.VerdantRenderer),
  {
    ssr: false,
    loading: () => null,
  }
);

interface CanvasPreviewProps {
  isRendererReady: boolean;
  hasContent: boolean;
  ast: any;
  resolvedTheme: "light" | "dark";
  errorCount: number;
}

export function CanvasPreview({
  isRendererReady,
  hasContent,
  ast,
  resolvedTheme,
  errorCount,
}: CanvasPreviewProps) {
  return (
    <div className="playground-canvas">
      {!isRendererReady && (
        <div className="playground-loader">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--accent-primary)]" />
          <span className="mt-3 text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
            Initializing scene
          </span>
        </div>
      )}

      {hasContent ? (
        <R3FErrorBoundary>
          <VerdantRenderer
            ast={ast}
            theme={resolvedTheme}
            width="100%"
            height="100%"
            autoRotate
          />
        </R3FErrorBoundary>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="h-28 w-28 rounded-full border border-[color:var(--border-subtle)] bg-[radial-gradient(circle,rgba(82,183,136,0.12),transparent_70%)]" />
          <p className="text-sm text-[color:var(--text-muted)]">
            {errorCount > 0
              ? "Fix syntax errors to render"
              : "Add nodes to see the scene"}
          </p>
        </div>
      )}
    </div>
  );
}
