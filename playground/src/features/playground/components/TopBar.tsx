"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  Share2,
  Sun,
  Moon,
  MoreHorizontal,
  Image,
  RotateCcw,
  Maximize,
  Keyboard,
} from "lucide-react";
import { Leaf } from "../../shared/ui/Leaf";

interface TopBarProps {
  onShareClick: () => void;
  onExportPngClick: () => void;
  onThemeToggle: () => void;
  resolvedTheme: "light" | "dark";
}

export function TopBar({
  onShareClick,
  onExportPngClick,
  onThemeToggle,
  resolvedTheme,
}: TopBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        overflowRef.current &&
        !overflowRef.current.contains(e.target as Node)
      ) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close overflow on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverflowOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="pg-topbar">
      {/* ═══ Left cluster ═══ */}
      <div className="pg-topbar-left">
        <Link href="/" className="pg-topbar-cell pg-topbar-cell--brand">
          <Leaf />
          <span>verdant</span>
        </Link>
        <span className="pg-topbar-cell pg-topbar-cell--mono">
          playground
        </span>
      </div>

      {/* ═══ Middle: fading blueprint lines ═══ */}
      <div className="pg-topbar-mid" aria-hidden="true" />

      {/* ═══ Right cluster ═══ */}
      <div className="pg-topbar-right">
        {/* Share */}
        <button
          type="button"
          onClick={onShareClick}
          className="pg-topbar-cell"
          aria-label="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="pg-topbar-hide-mobile">Share</span>
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onThemeToggle}
          className="pg-topbar-cell pg-topbar-cell--icon"
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Overflow menu */}
        <div className="pg-overflow-anchor" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setOverflowOpen((o) => !o)}
            className="pg-topbar-cell pg-topbar-cell--icon"
            aria-label="More options"
            aria-expanded={overflowOpen}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {overflowOpen && (
            <div className="pg-overflow" role="menu">
              <button
                className="pg-overflow-item"
                role="menuitem"
                onClick={() => {
                  onExportPngClick();
                  setOverflowOpen(false);
                }}
              >
                <span className="pg-overflow-item-label">
                  <Image className="h-3.5 w-3.5" />
                  Export PNG
                </span>
                <span className="pg-overflow-item-shortcut">⌘⇧E</span>
              </button>

              <button
                className="pg-overflow-item"
                role="menuitem"
                onClick={() => setOverflowOpen(false)}
              >
                <span className="pg-overflow-item-label">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset camera
                </span>
                <span className="pg-overflow-item-shortcut">⌘R</span>
              </button>

              <button
                className="pg-overflow-item"
                role="menuitem"
                onClick={() => {
                  document.documentElement.requestFullscreen?.()?.catch((err) => {
                    console.warn("Fullscreen request failed:", err);
                  });
                  setOverflowOpen(false);
                }}
              >
                <span className="pg-overflow-item-label">
                  <Maximize className="h-3.5 w-3.5" />
                  Fullscreen
                </span>
                <span className="pg-overflow-item-shortcut">F</span>
              </button>

              <button
                className="pg-overflow-item"
                role="menuitem"
                onClick={() => setOverflowOpen(false)}
              >
                <span className="pg-overflow-item-label">
                  <Keyboard className="h-3.5 w-3.5" />
                  Shortcuts
                </span>
                <span className="pg-overflow-item-shortcut">⌘?</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}