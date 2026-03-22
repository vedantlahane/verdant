// features/playground/components/TopBar.tsx

"use client";

import { useRef, useState, useCallback, memo } from "react";
import Link from "next/link";
import {
  Share2,
  Sun,
  Moon,
  MoreHorizontal,
  ImageIcon,
  RotateCcw,
  Maximize,
  Keyboard,
  Undo2,
  Redo2,
  Maximize2,
  Download,
  Map,
  Sparkles,
  Grid3X3,
} from "lucide-react";
import { Leaf } from "../../shared/ui/Leaf";
import { useOutsideClick } from "../hooks/useOutsideClick";
import type { ExportFormat, LayoutType } from "../types";

// ── Types ──

interface TopBarProps {
  // Core
  readonly onShareClick: () => void;
  readonly onExportPngClick: () => void;
  readonly onThemeToggle: () => void;
  readonly resolvedTheme: "light" | "dark";
  // Undo/Redo
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  // View
  readonly onZoomToFit?: () => void;
  readonly onExport?: (format: ExportFormat) => void;
  // Layout
  readonly activeLayout?: LayoutType;
  readonly onLayoutChange?: (layout: LayoutType) => void;
  readonly activeLayoutDirection?: 'TB' | 'LR';
  readonly onLayoutDirectionChange?: (dir: 'TB' | 'LR') => void;
  // Toggles
  readonly minimapEnabled?: boolean;
  readonly onMinimapToggle?: () => void;
  readonly postProcessingEnabled?: boolean;
  readonly onPostProcessingToggle?: () => void;
  readonly gridSnapEnabled?: boolean;
  readonly onGridSnapToggle?: () => void;
  readonly onResetCamera?: () => void;
  readonly onShortcutHelpToggle?: () => void;
}


interface OverflowItemDef {
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly shortcut: string;
  readonly id: string;
}

// ── Frozen constants (pattern 8) ──

const BRAND_STYLE = Object.freeze({
  fontSize: "1.05rem",
  letterSpacing: "0.08em",
  textTransform: "lowercase",
} as const) as React.CSSProperties;

const OVERFLOW_ITEMS: readonly OverflowItemDef[] = Object.freeze([
  Object.freeze({
    id: "reset-camera",
    label: "Reset camera",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    shortcut: "⌘R",
  }),
  Object.freeze({
    id: "fullscreen",
    label: "Fullscreen",
    icon: <Maximize className="h-3.5 w-3.5" />,
    shortcut: "F",
  }),
  Object.freeze({
    id: "shortcuts",
    label: "Shortcuts",
    icon: <Keyboard className="h-3.5 w-3.5" />,
    shortcut: "?",
  }),
]);
const EXPORT_FORMATS: readonly { id: ExportFormat; label: string }[] = Object.freeze([
  Object.freeze({ id: "png" as const, label: "PNG" }),
  Object.freeze({ id: "svg" as const, label: "SVG" }),
  Object.freeze({ id: "gltf" as const, label: "GLTF" }),
]);

// Platform-aware modifier key label
const MOD_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "⌘" : "Ctrl+";


// ── GitHubIcon (static SVG, memoized) ──

const GitHubIcon = memo(function GitHubIcon() {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
});

// ── Main component ──

/**
 * Top navigation bar — brand, undo/redo, layout selector,
 * toggle buttons, export, share, theme, and overflow menu.
 *
 * Memoized with custom comparator to avoid re-renders from
 * unrelated state changes in PlaygroundApp.
 */
export const TopBar = memo(function TopBar({
  onShareClick,
  onExportPngClick,
  onThemeToggle,
  resolvedTheme,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onZoomToFit,
  onExport,
  activeLayout = "auto",
  onLayoutChange,
  activeLayoutDirection = 'TB',
  onLayoutDirectionChange,
  minimapEnabled = false,
  onMinimapToggle,
  postProcessingEnabled = false,
  onPostProcessingToggle,
  gridSnapEnabled = false,
  onGridSnapToggle,
  onResetCamera,
  onShortcutHelpToggle,
}: TopBarProps) {


  const [overflowOpen, setOverflowOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const closeOverflow = useCallback(() => setOverflowOpen(false), []);
  const closeExport = useCallback(() => setExportOpen(false), []);

  useOutsideClick(overflowRef, closeOverflow, overflowOpen);
  useOutsideClick(exportRef, closeExport, exportOpen);

  const toggleOverflow = useCallback(
    () => setOverflowOpen((o) => !o),
    [],
  );

  const toggleExport = useCallback(
    () => setExportOpen((o) => !o),
    [],
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (format === "png") {
        onExportPngClick();
      }
      onExport?.(format);
      setExportOpen(false);
    },
    [onExport, onExportPngClick],
  );

  const handleOverflowAction = useCallback(
    (id: string) => {
      switch (id) {
        case "reset-camera":
          onResetCamera?.();
          break;
        case "fullscreen":
          document.documentElement.requestFullscreen?.()?.catch(() => {});
          break;
        case "shortcuts":
          onShortcutHelpToggle?.();
          break;
      }
      closeOverflow();
    },
    [closeOverflow, onResetCamera, onShortcutHelpToggle],
  );


  const handleLayoutChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onLayoutChange?.(e.target.value as LayoutType);
    },
    [onLayoutChange],
  );

  const handleUndoClick = useCallback(() => {
    if (canUndo) onUndo?.();
  }, [canUndo, onUndo]);

  const handleRedoClick = useCallback(() => {
    if (canRedo) onRedo?.();
  }, [canRedo, onRedo]);

  return (
    <header className="pg-topbar">
      {/* Left cluster */}
      <div className="pg-topbar-left">
        <Link href="/" className="pg-topbar-cell pg-topbar-cell--brand">
          <Leaf />
          <span className="font-body" style={BRAND_STYLE}>
            verdant
          </span>
        </Link>
        <span className="pg-topbar-cell pg-topbar-cell--mono">playground</span>

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={handleUndoClick}
          className="pg-topbar-cell pg-topbar-cell--icon"
          aria-label="Undo"
          aria-disabled={!canUndo}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleRedoClick}
          className="pg-topbar-cell pg-topbar-cell--icon"
          aria-label="Redo"
          aria-disabled={!canRedo}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        {/* Zoom to fit */}
        <button
          type="button"
          onClick={onZoomToFit}
          className="pg-topbar-cell pg-topbar-cell--icon"
          aria-label="Zoom to fit"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        <div className="pg-topbar-select-group">
          <select
            value={activeLayout}
            onChange={handleLayoutChange}
            className="pg-topbar-select"
            aria-label="Layout mode"
          >
            <option value="auto">Auto</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="forced">Force Directed</option>
            <option value="circular">Circular</option>
            <option value="grid">Grid</option>
          </select>

          {activeLayout === 'hierarchical' && (
            <select
              value={activeLayoutDirection}
              onChange={(e) => onLayoutDirectionChange?.(e.target.value as 'TB' | 'LR')}
              className="pg-topbar-select pg-topbar-select--small"
            >
              <option value="TB">Vertical</option>
              <option value="LR">Horizontal</option>
            </select>
          )}
        </div>
      </div>

      {/* Middle spacer */}
      <div className="pg-topbar-mid" aria-hidden="true" />

      {/* Right cluster */}
      <div className="pg-topbar-right">
        {/* Toggle buttons */}
        <button
          type="button"
          onClick={onMinimapToggle}
          className={`pg-topbar-cell pg-topbar-cell--icon${minimapEnabled ? " pg-topbar-cell--active" : ""}`}
          aria-label="Toggle minimap"
          aria-pressed={minimapEnabled}
        >
          <Map className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onPostProcessingToggle}
          className={`pg-topbar-cell pg-topbar-cell--icon${postProcessingEnabled ? " pg-topbar-cell--active" : ""}`}
          aria-label="Toggle post-processing"
          aria-pressed={postProcessingEnabled}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onGridSnapToggle}
          className={`pg-topbar-cell pg-topbar-cell--icon${gridSnapEnabled ? " pg-topbar-cell--active" : ""}`}
          aria-label="Toggle grid snap"
          aria-pressed={gridSnapEnabled}
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </button>

        {/* Export dropdown */}
        <div className="pg-overflow-anchor" ref={exportRef}>
          <button
            type="button"
            onClick={toggleExport}
            className="pg-topbar-cell pg-topbar-cell--icon"
            aria-label="Export diagram"
            aria-expanded={exportOpen}
            aria-haspopup="menu"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="pg-topbar-hide-mobile">Export</span>
          </button>

          {exportOpen && (
            <div className="pg-overflow" role="menu">
              {EXPORT_FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  className="pg-overflow-item"
                  role="menuitem"
                  onClick={() => handleExport(fmt.id)}
                >
                  <span className="pg-overflow-item-label">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {fmt.label}
                  </span>
                  {fmt.id === "png" && (
                    <span className="pg-overflow-item-shortcut">{MOD_KEY}⇧E</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onShareClick}
          className="pg-topbar-cell"
          aria-label="Share diagram"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="pg-topbar-hide-mobile">Share</span>
        </button>

        <a
          href="https://github.com/vedantlahane/verdant"
          target="_blank"
          rel="noopener noreferrer"
          className="pg-topbar-cell pg-topbar-cell--icon"
          aria-label="GitHub repository"
        >
          <GitHubIcon />
        </a>

        <button
          type="button"
          onClick={onThemeToggle}
          className="pg-topbar-cell pg-topbar-cell--icon"
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="pg-overflow-anchor" ref={overflowRef}>
          <button
            type="button"
            onClick={toggleOverflow}
            className="pg-topbar-cell pg-topbar-cell--icon"
            aria-label="More options"
            aria-expanded={overflowOpen}
            aria-haspopup="menu"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {overflowOpen && (
            <div className="pg-overflow" role="menu">
              {OVERFLOW_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className="pg-overflow-item"
                  role="menuitem"
                  onClick={() => handleOverflowAction(item.id)}
                >
                  <span className="pg-overflow-item-label">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="pg-overflow-item-shortcut">
                    {item.shortcut}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
},
function topBarPropsAreEqual(prev, next) {
  return (
    prev.resolvedTheme === next.resolvedTheme &&
    prev.canUndo === next.canUndo &&
    prev.canRedo === next.canRedo &&
    prev.activeLayout === next.activeLayout &&
    prev.activeLayoutDirection === next.activeLayoutDirection &&
    prev.minimapEnabled === next.minimapEnabled &&
    prev.postProcessingEnabled === next.postProcessingEnabled &&
    prev.gridSnapEnabled === next.gridSnapEnabled &&
    prev.onShareClick === next.onShareClick &&
    prev.onExportPngClick === next.onExportPngClick &&
    prev.onThemeToggle === next.onThemeToggle &&
    prev.onUndo === next.onUndo &&
    prev.onRedo === next.onRedo &&
    prev.onZoomToFit === next.onZoomToFit &&
    prev.onExport === next.onExport &&
    prev.onLayoutChange === next.onLayoutChange &&
    prev.onLayoutDirectionChange === next.onLayoutDirectionChange &&
    prev.onMinimapToggle === next.onMinimapToggle &&
    prev.onPostProcessingToggle === next.onPostProcessingToggle &&
    prev.onGridSnapToggle === next.onGridSnapToggle &&
    prev.onResetCamera === next.onResetCamera &&
    prev.onShortcutHelpToggle === next.onShortcutHelpToggle
  );
});