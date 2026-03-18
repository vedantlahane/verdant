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
          <span className="font-body" style={{ fontSize: '1.05rem', letterSpacing: '0.08em', textTransform: 'lowercase' }}>verdant</span>
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

        {/* GitHub */}
        <a
          href="https://github.com/vedantlahane/verdant"
          target="_blank"
          rel="noopener noreferrer"
          className="pg-topbar-cell pg-topbar-cell--icon"
          aria-label="GitHub"
        >
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </a>

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