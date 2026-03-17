"use client";

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
            <span style={{ color: "#e57373" }}>· {errorCount}⊘</span>
          )}
        </button>
      )}

      {/* ── Panel ── */}
      <div className={`pg-schema ${open ? "pg-schema--open" : "pg-schema--closed"}`}>
        {/* ← This wrapper creates the blur bleed + grid lines through panel */}
        <div className="pg-schema-body">
          {/* Header */}
          <div className="pg-schema-label">
          <span className="section-label">// schema</span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
              }}
              aria-label="Close"
            >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tabs: Code / AI */}
        <div className="pg-schema-tabs">
          <button
            type="button"
            className={`pg-schema-tab ${activeTab === "code" ? "pg-schema-tab--active" : ""}`}
            onClick={() => onTabChange("code")}
          >
            <Code2 style={{ width: 12, height: 12 }} />
            code
          </button>
          <button
            type="button"
            className={`pg-schema-tab ${activeTab === "ai" ? "pg-schema-tab--active" : ""}`}
            onClick={() => onTabChange("ai")}
          >
            <Sparkles style={{ width: 12, height: 12 }} />
            ai
          </button>
        </div>

        {/* ═══ Code tab ═══ */}
        {activeTab === "code" && (
          <>
            {/* Presets */}
            <div className="pg-schema-presets">
              <div className="relative" ref={presetsRef}>
                <button
                  type="button"
                  onClick={() => onPresetsOpenChange(!presetsOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: "none",
                    border: "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.08em",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <span>
                    {activePreset ? PRESETS[activePreset].label : "Custom"}
                  </span>
                  <ChevronDown
                    style={{
                      width: 10,
                      height: 10,
                      transition: "transform 150ms",
                      transform: presetsOpen ? "rotate(180deg)" : "rotate(0)",
                    }}
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
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: "var(--text-primary)",
                            }}
                          >
                            {p.label}
                          </span>
                          {activePreset === key && (
                            <Check style={{ width: 10, height: 10, color: "var(--accent)" }} />
                          )}
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.6rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {p.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status dot */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: errorCount > 0 ? "#e57373" : "var(--accent)",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    color: "var(--text-muted)",
                  }}
                >
                  {errorCount > 0 ? `${errorCount} errors` : "valid"}
                </span>
              </div>
            </div>

            {/* Editor */}
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
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onAiApply();
                }
              }}
              placeholder="describe what to build or change..."
              className="pg-ai-input"
            />

            {/* Error */}
            {aiError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.7rem",
                  color: "#e57373",
                }}
              >
                <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-mono)" }}>{aiError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pg-ai-actions">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6rem",
                  color: "var(--text-muted)",
                }}
              >
                ⌘↵ to apply
              </span>
              <button
                type="button"
                onClick={onAiApply}
                disabled={isGenerating || !aiPrompt.trim()}
                className="btn-primary"
                style={{
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.7rem",
                  opacity: isGenerating || !aiPrompt.trim() ? 0.4 : 1,
                  cursor: isGenerating || !aiPrompt.trim() ? "not-allowed" : "pointer",
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
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
                <div className="pg-ai-history-label">── history ──</div>
                <div className="pg-ai-history">
                  {aiHistory.map((entry) => (
                    <div key={entry.id} className="pg-ai-history-item">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.7rem",
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ✓ {entry.prompt}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.6rem",
                            color: "var(--text-muted)",
                            marginTop: "0.125rem",
                          }}
                        >
                          {entry.nodesBefore}n·{entry.edgesBefore}e →{" "}
                          {entry.nodesAfter}n·{entry.edgesAfter}e
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAiUndo(entry.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "0.25rem",
                          flexShrink: 0,
                          transition: "color 150ms ease",
                        }}
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
    </>
  );
}