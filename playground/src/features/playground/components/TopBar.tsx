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
  Keyboard,
  Maximize,
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

  return (
    <header className="pg-topbar">
      {/* ── Left cells ── */}
      <div className="pg-topbar-left">
        <Link href="/" className="pg-topbar-cell pg-topbar-cell--brand">
          <Leaf />
          <span>verdant</span>
        </Link>
        <span className="pg-topbar-cell pg-topbar-cell--mono">
          playground
        </span>
      </div>

      {/* ── Middle: fading grid lines ── */}
      <div className="pg-topbar-mid" />

      {/* ── Right cells ── */}
      <div className="pg-topbar-right">
        <button
          type="button"
          onClick={onShareClick}
          className="pg-topbar-cell"
          aria-label="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          type="button"
          onClick={onThemeToggle}
          className="pg-topbar-cell"
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>

        {/* ── Overflow ── */}
        <div className="relative" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setOverflowOpen((o) => !o)}
            className="pg-topbar-cell"
            aria-label="More"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {overflowOpen && (
            <div className="pg-overflow">
              <button
                className="pg-overflow-item"
                onClick={() => {
                  onExportPngClick();
                  setOverflowOpen(false);
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Image className="h-3.5 w-3.5" />
                  Export PNG
                </span>
                <span>⌘⇧E</span>
              </button>
              <button className="pg-overflow-item" onClick={() => setOverflowOpen(false)}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset camera
                </span>
                <span>⌘R</span>
              </button>
              <button className="pg-overflow-item" onClick={() => setOverflowOpen(false)}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Maximize className="h-3.5 w-3.5" />
                  Fullscreen
                </span>
                <span>F</span>
              </button>
              <button className="pg-overflow-item" onClick={() => setOverflowOpen(false)}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Keyboard className="h-3.5 w-3.5" />
                  Shortcuts
                </span>
                <span>⌘?</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}