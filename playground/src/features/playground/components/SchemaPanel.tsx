// features/playground/components/SchemaPanel.tsx

"use client";

import { useMemo, useCallback, memo } from "react";
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

// ── Types ──

interface SchemaPanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly activeTab: "code" | "ai";
  readonly onTabChange: (tab: "code" | "ai") => void;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly presetsOpen: boolean;
  readonly onPresetsOpenChange: (open: boolean) => void;
  readonly activePreset: string;
  readonly onSelectPreset: (key: string) => void;
  readonly presetsRef: React.RefObject<HTMLDivElement | null>;
  readonly aiPrompt: string;
  readonly onAiPromptChange: (value: string) => void;
  readonly onAiApply: () => void;
  readonly isGenerating: boolean;
  readonly aiError: string;
  readonly aiHistory: readonly AiHistoryEntry[];
  readonly onAiUndo: (entryId: string) => void;
  readonly editorChildren: React.ReactNode;
}

// ── Frozen constants ──

const TAB_ICON_STYLE = Object.freeze({
  width: 12,
  height: 12,
} as const) as React.CSSProperties;

const PRESETS_FLEX_STYLE = Object.freeze({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
} as const) as React.CSSProperties;

const SPINNER_STYLE = Object.freeze({
  width: 12,
  height: 12,
  animation: "spin 1s linear infinite",
} as const) as React.CSSProperties;

const AI_APPLY_BTN_BASE = Object.freeze({
  padding: "0.375rem 0.75rem",
  fontSize: "0.7rem",
} as const) as React.CSSProperties;

const AI_ERROR_ICON_STYLE = Object.freeze({
  width: 12,
  height: 12,
  flexShrink: 0,
} as const) as React.CSSProperties;

const RULER_INTERVAL = 80;
const RULER_COUNT = 20;

// ── Sub-components ──

const TabButton = memo(function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  readonly active: boolean;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick: () => void;
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
});

const CodeTabContent = memo(function CodeTabContent({
  presetsOpen,
  onPresetsOpenChange,
  activePreset,
  onSelectPreset,
  presetsRef,
  errorCount,
  editorChildren,
}: {
  readonly presetsOpen: boolean;
  readonly onPresetsOpenChange: (open: boolean) => void;
  readonly activePreset: string;
  readonly onSelectPreset: (key: string) => void;
  readonly presetsRef: React.RefObject<HTMLDivElement | null>;
  readonly errorCount: number;
  readonly editorChildren: React.ReactNode;
}) {
  const togglePresets = useCallback(
    () => onPresetsOpenChange(!presetsOpen),
    [presetsOpen, onPresetsOpenChange],
  );

  return (
    <>
      {/* Presets row */}
      <div className="pg-schema-presets">
        <div className="relative" ref={presetsRef}>
          <button
            type="button"
            onClick={togglePresets}
            className="pg-schema-presets-btn"
            aria-expanded={presetsOpen}
            aria-haspopup="listbox"
          >
            <span>
              {activePreset
                ? PRESETS[activePreset]?.label ?? "Custom"
                : "Custom"}
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
                  <div style={PRESETS_FLEX_STYLE}>
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
});

const AiTabContent = memo(function AiTabContent({
  aiPrompt,
  onAiPromptChange,
  onAiApply,
  isGenerating,
  aiError,
  aiHistory,
  onAiUndo,
}: {
  readonly aiPrompt: string;
  readonly onAiPromptChange: (value: string) => void;
  readonly onAiApply: () => void;
  readonly isGenerating: boolean;
  readonly aiError: string;
  readonly aiHistory: readonly AiHistoryEntry[];
  readonly onAiUndo: (entryId: string) => void;
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

  const applyBtnStyle = useMemo(
    () => ({
      ...AI_APPLY_BTN_BASE,
      opacity: canApply ? 1 : 0.4,
      cursor: canApply ? "pointer" : "not-allowed",
    }),
    [canApply],
  ) as React.CSSProperties;

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
          <AlertTriangle style={AI_ERROR_ICON_STYLE} />
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
          style={applyBtnStyle}
        >
          {isGenerating ? (
            <>
              <Loader2 style={SPINNER_STYLE} />
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
                  <Undo2 style={TAB_ICON_STYLE} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

// ── Decorative components ──

const RegistrationMarks = memo(function RegistrationMarks() {
  return (
    <div className="pg-schema-reg-marks" aria-hidden="true">
      <div className="pg-schema-reg-tl" />
      <div className="pg-schema-reg-tr" />
      <div className="pg-schema-reg-bl" />
      <div className="pg-schema-reg-br" />
    </div>
  );
});

const RulerMarks = memo(function RulerMarks() {
  const ticks = useMemo(() => {
    const result: Array<{
      readonly top: number;
      readonly major: boolean;
      readonly label: string;
    }> = [];
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
});

const TitleBlock = memo(function TitleBlock({
  nodeCount,
  edgeCount,
  activePreset,
}: {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly activePreset: string;
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
});

// ── Main component ──

/**
 * Schema panel — code editor + AI generation + presets.
 *
 * Slides in from the left with a blueprint-style bleed effect.
 * Memoized to avoid re-renders from unrelated state changes.
 */
export const SchemaPanel = memo(function SchemaPanel({
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

  const handleClose = useCallback(
    () => onOpenChange(false),
    [onOpenChange],
  );

  const handleOpen = useCallback(
    () => onOpenChange(true),
    [onOpenChange],
  );

  return (
    <>
      {/* Collapsed toggle */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
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
                onClick={handleClose}
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
                icon={<Code2 style={TAB_ICON_STYLE} />}
                label="code"
                onClick={() => onTabChange("code")}
              />
              <TabButton
                active={activeTab === "ai"}
                icon={<Sparkles style={TAB_ICON_STYLE} />}
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
});