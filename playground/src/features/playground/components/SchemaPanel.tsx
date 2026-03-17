"use client";

import { useMemo } from "react";
import {
  Code2,
  Sparkles,
  X,
  ChevronDown,
  Check,
  Loader2,
  Undo2,
  AlertTriangle,
} from "lucide-react";
import { PRESETS } from "@/features/playground/constants";
import type { AiHistoryEntry } from "../PlaygroundApp";

interface SchemaPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: "code" | "ai";
  onTabChange: (tab: "code" | "ai") => void;
  errorCount: number;
  warningCount: number;
  nodeCount: number;
  edgeCount: number;
  presetsOpen: boolean;
  onPresetsOpenChange: (open: boolean) => void;
  activePreset: string;
  onSelectPreset: (key: string) => void;
  presetsRef: React.RefObject<HTMLDivElement | null>;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onAiApply: () => void;
  isGenerating: boolean;
  aiError: string;
  aiHistory: AiHistoryEntry[];
  onAiUndo: (entryId: string) => void;
  editorChildren: React.ReactNode;
}

/* ── Ruler ticks (generated once) ── */
const RULER_INTERVAL = 80; // matches viewport grid row height
const RULER_COUNT = 20;

function RulerMarks() {
  const ticks = useMemo(() => {
    const result: { top: number; major: boolean; label: string }[] = [];
    for (let i = 0; i <= RULER_COUNT; i++) {
      const top = i * RULER_INTERVAL;
      result.push({
        top,
        major: i % 4 === 0,
        label: String(i).padStart(2, "0"),
      });
    }
    return result;
  }, []);

  return (
    <div className="pg-schema-ruler" aria-hidden="true">
      {ticks.map((t) => (
        <div key={t.top}>
          <div
            className={`pg-schema-ruler-tick ${
              t.major ? "pg-schema-ruler-tick--major" : ""
            }`}
            style={{ top: t.top }}
          />
          {t.major && (
            <span
              className="pg-schema-ruler-num"
              style={{ top: t.top }}
            >
              {t.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function SchemaPanel({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  errorCount,
  warningCount,
  nodeCount,
  edgeCount,
  presetsOpen,
  onPresetsOpenChange,
  activePreset,
  onSelectPreset,
  presetsRef,
  aiPrompt,
  onAiPromptChange,
  onAiApply,
  isGenerating,
  aiError,
  aiHistory,
  onAiUndo,
  editorChildren,
}: SchemaPanelProps) {
  return (
    <>
      {/* ── Collapsed toggle ── */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="pg-schema-toggle"
        >
          <span>// schema</span>
          {errorCount > 0 && (
            <span className="pg-schema-toggle-error">
              · {errorCount}⊘
            </span>
          )}
        </button>
      )}

      {/* ── Panel ── */}
      <div
        className={`pg-schema ${
          open ? "pg-schema--open" : "pg-schema--closed"
        }`}
      >
        <div className="pg-schema-body">
          {/* Blur-bleed zone */}
          <div className="pg-schema-bleed" aria-hidden="true" />

          {/* Faint grid lines through the panel */}
          <div className="pg-schema-grid" aria-hidden="true" />

          {/* Cell-guide vertical lines (code tab stops) */}
          <div className="pg-schema-cellguide" aria-hidden="true" />

          {/* ═══ Drafting decorations ═══ */}
          {/* Registration corner marks */}
          <div className="pg-schema-reg-marks" aria-hidden="true">
            <div className="pg-schema-reg-tl" />
            <div className="pg-schema-reg-tr" />
            <div className="pg-schema-reg-bl" />
            <div className="pg-schema-reg-br" />
          </div>

          {/* Left ruler */}
          <RulerMarks />

          {/* Title block (engineering drawing label) */}
          <div className="pg-schema-titleblock" aria-hidden="true">
            <span className="pg-schema-titleblock-row">
              verdant · schema
            </span>
            <span className="pg-schema-titleblock-row">
              rev: {nodeCount}n {edgeCount}e
            </span>
            <span className="pg-schema-titleblock-row">
              scale: 1:1 · {activePreset || "custom"}
            </span>
          </div>

          {/* All content */}
          <div className="pg-schema-content">
            {/* Header */}
            <div className="pg-schema-label">
              <span className="section-label">// schema</span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="pg-schema-close"
                aria-label="Close schema panel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="pg-schema-tabs">
              <button
                type="button"
                className={`pg-schema-tab ${
                  activeTab === "code" ? "pg-schema-tab--active" : ""
                }`}
                onClick={() => onTabChange("code")}
              >
                <Code2 style={{ width: 12, height: 12 }} />
                code
              </button>
              <button
                type="button"
                className={`pg-schema-tab ${
                  activeTab === "ai" ? "pg-schema-tab--active" : ""
                }`}
                onClick={() => onTabChange("ai")}
              >
                <Sparkles style={{ width: 12, height: 12 }} />
                ai
              </button>
            </div>

            {/* ═══ Code tab ═══ */}
            {activeTab === "code" && (
              <>
                {/* Presets row */}
                <div className="pg-schema-presets">
                  <div className="relative" ref={presetsRef}>
                    <button
                      type="button"
                      onClick={() => onPresetsOpenChange(!presetsOpen)}
                      className="pg-schema-presets-btn"
                    >
                      <span>
                        {activePreset
                          ? PRESETS[activePreset].label
                          : "Custom"}
                      </span>
                      <ChevronDown
                        className={`pg-schema-presets-chevron ${
                          presetsOpen
                            ? "pg-schema-presets-chevron--open"
                            : ""
                        }`}
                      />
                    </button>

                    {presetsOpen && (
                      <div className="pg-presets-dropdown">
                        {Object.entries(PRESETS).map(([key, p]) => (
                          <button
                            key={key}
                            onClick={() => onSelectPreset(key)}
                            className="pg-presets-item"
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span className="pg-presets-item-name">
                                {p.label}
                              </span>
                              {activePreset === key && (
                                <Check className="pg-presets-item-check" />
                              )}
                            </div>
                            <span className="pg-presets-item-desc">
                              {p.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status dot */}
                  <div className="pg-schema-status-dot">
                    <div
                      className={`pg-schema-status-dot-circle ${
                        errorCount > 0
                          ? "pg-schema-status-dot-circle--error"
                          : "pg-schema-status-dot-circle--ok"
                      }`}
                    />
                    <span className="pg-schema-status-dot-label">
                      {errorCount > 0 ? `${errorCount} errors` : "valid"}
                    </span>
                  </div>
                </div>

                {/* Monaco editor */}
                <div className="pg-schema-editor">{editorChildren}</div>
              </>
            )}

            {/* ═══ AI tab ═══ */}
            {activeTab === "ai" && (
              <div className="pg-ai-area">
                {/* Input */}
                <textarea
                  autoFocus
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => onAiPromptChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      (e.metaKey || e.ctrlKey)
                    ) {
                      e.preventDefault();
                      onAiApply();
                    }
                  }}
                  placeholder="describe what to build or change..."
                  className="pg-ai-input"
                />

                {/* Error */}
                {aiError && (
                  <div className="pg-ai-error">
                    <AlertTriangle
                      style={{ width: 12, height: 12, flexShrink: 0 }}
                    />
                    <span>{aiError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pg-ai-actions">
                  <span className="pg-ai-shortcut-hint">⌘↵ to apply</span>
                  <button
                    type="button"
                    onClick={onAiApply}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="btn-primary pg-ai-apply"
                    style={{
                      padding: "0.375rem 0.75rem",
                      fontSize: "0.7rem",
                      opacity:
                        isGenerating || !aiPrompt.trim() ? 0.4 : 1,
                      cursor:
                        isGenerating || !aiPrompt.trim()
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2
                          style={{
                            width: 12,
                            height: 12,
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        applying...
                      </>
                    ) : (
                      <>Apply →</>
                    )}
                  </button>
                </div>

                {/* History */}
                {aiHistory.length > 0 && (
                  <>
                    <div className="pg-ai-history-label">
                      ── history ──
                    </div>
                    <div className="pg-ai-history">
                      {aiHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="pg-ai-history-item"
                        >
                          <div className="pg-ai-history-item-text">
                            <div className="pg-ai-history-item-prompt">
                              ✓ {entry.prompt}
                            </div>
                            <div className="pg-ai-history-item-stats">
                              {entry.nodesBefore}n·{entry.edgesBefore}e
                              → {entry.nodesAfter}n·{entry.edgesAfter}e
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAiUndo(entry.id);
                            }}
                            className="pg-ai-history-undo"
                            title="Undo this change"
                          >
                            <Undo2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Status bar */}
            <div className="pg-schema-status">
              <span>
                {nodeCount}n · {edgeCount}e
              </span>
              <span>
                {errorCount > 0 && <>{errorCount}⊘ · </>}
                {warningCount > 0 && <>{warningCount}⚠ · </>}
                {errorCount === 0 && warningCount === 0 && "clean · "}
                {activeTab === "code" ? "editing" : "ai"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}