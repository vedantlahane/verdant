"use client";

import { useMemo, useCallback } from "react";
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
import { PRESETS } from "../constants/presets";
import { useOutsideClick } from "../hooks/useOutsideClick";
import type { AiHistoryEntry } from "../types";

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
  useOutsideClick(presetsRef, () => onPresetsOpenChange(false), presetsOpen);

  return (
    <>
      {/* Collapsed toggle */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="pg-schema-toggle"
          aria-label="Open schema panel"
        >
          <span>// schema</span>
          {errorCount > 0 && (
            <span className="pg-schema-toggle-error">· {errorCount}⊘</span>
          )}
        </button>
      )}

      {/* Panel */}
      <div
        className={`pg-schema ${open ? "pg-schema--open" : "pg-schema--closed"}`}
        role="region"
        aria-label="Schema panel"
      >
        <div className="pg-schema-body">
          {/* Decorative layers */}
          <div className="pg-schema-bleed" aria-hidden="true" />
          <div className="pg-schema-grid" aria-hidden="true" />
          <div className="pg-schema-cellguide" aria-hidden="true" />
          <RegistrationMarks />
          <RulerMarks />
          <TitleBlock
            nodeCount={nodeCount}
            edgeCount={edgeCount}
            activePreset={activePreset}
          />

          {/* Content */}
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
            <div className="pg-schema-tabs" role="tablist">
              <TabButton
                active={activeTab === "code"}
                icon={<Code2 style={{ width: 12, height: 12 }} />}
                label="code"
                onClick={() => onTabChange("code")}
              />
              <TabButton
                active={activeTab === "ai"}
                icon={<Sparkles style={{ width: 12, height: 12 }} />}
                label="ai"
                onClick={() => onTabChange("ai")}
              />
            </div>

            {/* Tab content */}
            {activeTab === "code" ? (
              <CodeTabContent
                presetsOpen={presetsOpen}
                onPresetsOpenChange={onPresetsOpenChange}
                activePreset={activePreset}
                onSelectPreset={onSelectPreset}
                presetsRef={presetsRef}
                errorCount={errorCount}
                editorChildren={editorChildren}
              />
            ) : (
              <AiTabContent
                aiPrompt={aiPrompt}
                onAiPromptChange={onAiPromptChange}
                onAiApply={onAiApply}
                isGenerating={isGenerating}
                aiError={aiError}
                aiHistory={aiHistory}
                onAiUndo={onAiUndo}
              />
            )}

            {/* Status */}
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

// ── Sub-components ──

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`pg-schema-tab ${active ? "pg-schema-tab--active" : ""}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function CodeTabContent({
  presetsOpen,
  onPresetsOpenChange,
  activePreset,
  onSelectPreset,
  presetsRef,
  errorCount,
  editorChildren,
}: {
  presetsOpen: boolean;
  onPresetsOpenChange: (open: boolean) => void;
  activePreset: string;
  onSelectPreset: (key: string) => void;
  presetsRef: React.RefObject<HTMLDivElement | null>;
  errorCount: number;
  editorChildren: React.ReactNode;
}) {
  return (
    <>
      {/* Presets row */}
      <div className="pg-schema-presets">
        <div className="relative" ref={presetsRef}>
          <button
            type="button"
            onClick={() => onPresetsOpenChange(!presetsOpen)}
            className="pg-schema-presets-btn"
            aria-expanded={presetsOpen}
            aria-haspopup="listbox"
          >
            <span>
              {activePreset ? PRESETS[activePreset]?.label ?? "Custom" : "Custom"}
            </span>
            <ChevronDown
              className={`pg-schema-presets-chevron ${
                presetsOpen ? "pg-schema-presets-chevron--open" : ""
              }`}
            />
          </button>

          {presetsOpen && (
            <div className="pg-presets-dropdown" role="listbox">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  role="option"
                  aria-selected={activePreset === key}
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
                    <span className="pg-presets-item-name">{p.label}</span>
                    {activePreset === key && (
                      <Check className="pg-presets-item-check" />
                    )}
                  </div>
                  <span className="pg-presets-item-desc">{p.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status indicator */}
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

      {/* Editor */}
      <div className="pg-schema-editor">{editorChildren}</div>
    </>
  );
}

function AiTabContent({
  aiPrompt,
  onAiPromptChange,
  onAiApply,
  isGenerating,
  aiError,
  aiHistory,
  onAiUndo,
}: {
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onAiApply: () => void;
  isGenerating: boolean;
  aiError: string;
  aiHistory: AiHistoryEntry[];
  onAiUndo: (entryId: string) => void;
}) {
  const canApply = !isGenerating && aiPrompt.trim().length > 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (canApply) onAiApply();
      }
    },
    [canApply, onAiApply],
  );

  return (
    <div className="pg-ai-area">
      {/* Input */}
      <textarea
        autoFocus
        rows={4}
        value={aiPrompt}
        onChange={(e) => onAiPromptChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="describe what to build or change..."
        className="pg-ai-input"
        aria-label="AI prompt"
      />

      {/* Error */}
      {aiError && (
        <div className="pg-ai-error" role="alert">
          <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
          <span>{aiError}</span>
        </div>
      )}

      {/* Actions */}
      <div className="pg-ai-actions">
        <span className="pg-ai-shortcut-hint">⌘↵ to apply</span>
        <button
          type="button"
          onClick={onAiApply}
          disabled={!canApply}
          className="btn-primary pg-ai-apply"
          style={{
            padding: "0.375rem 0.75rem",
            fontSize: "0.7rem",
            opacity: canApply ? 1 : 0.4,
            cursor: canApply ? "pointer" : "not-allowed",
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
          <div className="pg-ai-history-label">── history ──</div>
          <div className="pg-ai-history">
            {aiHistory.map((entry) => (
              <div key={entry.id} className="pg-ai-history-item">
                <div className="pg-ai-history-item-text">
                  <div className="pg-ai-history-item-prompt">
                    ✓ {entry.prompt}
                  </div>
                  <div className="pg-ai-history-item-stats">
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
                  className="pg-ai-history-undo"
                  title="Revert this change"
                  aria-label={`Undo: ${entry.prompt}`}
                >
                  <Undo2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Decorative components ──

function RegistrationMarks() {
  return (
    <div className="pg-schema-reg-marks" aria-hidden="true">
      <div className="pg-schema-reg-tl" />
      <div className="pg-schema-reg-tr" />
      <div className="pg-schema-reg-bl" />
      <div className="pg-schema-reg-br" />
    </div>
  );
}

const RULER_INTERVAL = 80;
const RULER_COUNT = 20;

function RulerMarks() {
  const ticks = useMemo(() => {
    const result: { top: number; major: boolean; label: string }[] = [];
    for (let i = 0; i <= RULER_COUNT; i++) {
      result.push({
        top: i * RULER_INTERVAL,
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
            <span className="pg-schema-ruler-num" style={{ top: t.top }}>
              {t.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TitleBlock({
  nodeCount,
  edgeCount,
  activePreset,
}: {
  nodeCount: number;
  edgeCount: number;
  activePreset: string;
}) {
  return (
    <div className="pg-schema-titleblock" aria-hidden="true">
      <span className="pg-schema-titleblock-row">verdant · schema</span>
      <span className="pg-schema-titleblock-row">
        rev: {nodeCount}n {edgeCount}e
      </span>
      <span className="pg-schema-titleblock-row">
        scale: 1:1 · {activePreset || "custom"}
      </span>
    </div>
  );
}