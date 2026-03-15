"use client";

import { Code2, X, ChevronDown, Check } from "lucide-react";
import { type EditorInstance } from "./Editor";
import { PRESETS } from "@/features/playground/constants";

interface SchemaPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorCount: number;
  warningCount: number;
  presetsOpen: boolean;
  onPresetsOpenChange: (open: boolean) => void;
  activePreset: string;
  onSelectPreset: (key: string) => void;
  editorChildren: React.ReactNode;
  presetsRef: React.RefObject<HTMLDivElement | null>;
}

export function SchemaPanel({
  open,
  onOpenChange,
  errorCount,
  warningCount,
  presetsOpen,
  onPresetsOpenChange,
  activePreset,
  onSelectPreset,
  editorChildren,
  presetsRef,
}: SchemaPanelProps) {
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="playground-schema-toggle"
        >
          <Code2 className="h-4 w-4" />
          <span>Schema</span>
          {errorCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {errorCount}
            </span>
          )}
        </button>
      )}

      <div
        className={`playground-schema ${
          open ? "playground-schema-open" : "playground-schema-closed"
        }`}
      >
        <div className="playground-schema-header">
          <div className="flex items-center gap-3">
            <Code2 className="h-4 w-4 text-[color:var(--accent-primary)]" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              Schema
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-[color:var(--text-muted)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)]"
            aria-label="Close schema"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] bg-white/5 px-4 py-2.5">
            <div className="relative" ref={presetsRef}>
              <button
                type="button"
                onClick={() => onPresetsOpenChange(!presetsOpen)}
                className="flex items-center gap-2 text-xs font-medium text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
              >
                <span>
                  {activePreset ? PRESETS[activePreset].label : "Custom"}
                </span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    presetsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {presetsOpen && (
                <div className="absolute left-0 top-full z-[100] mt-2 w-64 overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-1 shadow-2xl backdrop-blur-xl">
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => onSelectPreset(key)}
                      className="group flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-white/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[color:var(--text-primary)]">
                          {p.label}
                        </span>
                        {activePreset === key && (
                          <Check className="h-3 w-3 text-[color:var(--accent-primary)]" />
                        )}
                      </div>
                      <span className="text-[10px] text-[color:var(--text-muted)]">
                        {p.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    errorCount > 0 ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
                  {errorCount > 0 ? `${errorCount} errors` : "Valid"}
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex-1 bg-black/20">
            {editorChildren}
          </div>
        </div>
      </div>
    </>
  );
}
