// features/playground/components/SchemaPanel.tsx

"use client";

import { useMemo, useCallback, memo, useState, useEffect, useRef } from "react";
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
import type { VrdDiagnostic } from "@verdant/parser";

// ── Types ──

interface SchemaPanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly activeTab: "code" | "ai";
  readonly onTabChange: (tab: "code" | "ai") => void;
  readonly code: string;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly diagnostics: readonly VrdDiagnostic[];
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly presetsOpen: boolean;
  readonly onPresetsOpenChange: (open: boolean) => void;
  readonly activePreset: string;
  readonly onSelectPreset: (key: string) => void;
  readonly onNewCode: () => void;
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
const RULER_COUNT = 60; // Increased to ensure scrolling demo

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
  onSelectPreset,
  onNewCode,
  presetsRef,
  errorCount,
  editorChildren,
  logs,
  activePreset,
}: {
  readonly presetsOpen: boolean;
  readonly onPresetsOpenChange: (open: boolean) => void;
  readonly activePreset: string;
  readonly onSelectPreset: (key: string) => void;
  readonly onNewCode: () => void;
  readonly presetsRef: React.RefObject<HTMLDivElement | null>;
  readonly errorCount: number;
  readonly editorChildren: React.ReactNode;
  readonly logs: string[];
}) {
  const togglePresets = useCallback(
    () => onPresetsOpenChange(!presetsOpen),
    [presetsOpen, onPresetsOpenChange],
  );

  // Auto-scroll log to bottom
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

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
              {/* New / Blank option */}
              <button
                role="option"
                aria-selected={!activePreset}
                onClick={onNewCode}
                className="pg-presets-item"
              >
                <div style={PRESETS_FLEX_STYLE}>
                  <span className="pg-presets-item-name">+ New (blank)</span>
                  {!activePreset && (
                    <Check className="pg-presets-item-check" />
                  )}
                </div>
                <span className="pg-presets-item-desc">Start fresh with empty canvas</span>
              </button>
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
            {errorCount > 0 ? `${errorCount} error${errorCount !== 1 ? 's' : ''}` : "valid"}
          </span>
        </div>
      </div>

      {/* Editor */}
      <div className="pg-schema-editor">{editorChildren}</div>

      {/* Scroll Demo / System Log */}
      <div className="pg-schema-demo">
        <div className="pg-schema-demo-header">// system log</div>
        <div className="pg-schema-demo-content">
          <div>[00.00] initializing kernel...</div>
          <div>[00.02] loading layout: {activePreset || "custom"}...</div>
          {logs.map((log, i) => <div key={`log-${i}-${log.slice(1, 8)}`}>{log}</div>)}
          <div className="opacity-40 animate-pulse">// monitoring live changes...</div>
          <div ref={logEndRef} />
        </div>
      </div>
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
  code,
  errorCount,
  warningCount,
  diagnostics,
  nodeCount,
  edgeCount,
  presetsOpen,
  onPresetsOpenChange,
  activePreset,
  onSelectPreset,
  onNewCode,
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

  const [logs, setLogs] = useState<string[]>([]);
  const lastState = useRef({ nodeCount, edgeCount, errorCount, warningCount, code });

  useEffect(() => {
    const prev = lastState.current;
    const now = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
    const ms = String(new Date().getMilliseconds()).padStart(3, '0').slice(0, 2);
    const ts = `[${now}.${ms}]`;

    const newLogs: string[] = [];

    // Error/warning changes
    if (errorCount !== prev.errorCount) {
      if (errorCount > prev.errorCount) {
        newLogs.push(`${ts} ✗ parsing: ${errorCount} error${errorCount !== 1 ? 's' : ''} detected`);
        const newErrors = diagnostics.filter(d => d.severity === 'error');
        for (const e of newErrors) {
          newLogs.push(`${ts}   Line ${e.line}: ${e.message}`);
        }
      } else if (errorCount === 0) {
        newLogs.push(`${ts} ✓ parsing: all errors resolved`);
      } else {
        newLogs.push(`${ts} ~ parsing: ${errorCount} error${errorCount !== 1 ? 's' : ''} remaining`);
        const newErrors = diagnostics.filter(d => d.severity === 'error');
        for (const e of newErrors) {
          newLogs.push(`${ts}   Line ${e.line}: ${e.message}`);
        }
      }
    }

    if (warningCount !== prev.warningCount && warningCount > 0) {
      newLogs.push(`${ts} ⚠ validation: ${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
      const newWarnings = diagnostics.filter(d => d.severity === 'warning');
      for (const w of newWarnings) {
        newLogs.push(`${ts}   Line ${w.line}: ${w.message}`);
      }
    }

    // Structure changes
    if (nodeCount !== prev.nodeCount || edgeCount !== prev.edgeCount) {
      const nodeDiff = nodeCount - prev.nodeCount;
      const edgeDiff = edgeCount - prev.edgeCount;
      const parts: string[] = [];
      if (nodeDiff !== 0) parts.push(`${nodeDiff > 0 ? '+' : ''}${nodeDiff} node${Math.abs(nodeDiff) !== 1 ? 's' : ''}`);
      if (edgeDiff !== 0) parts.push(`${edgeDiff > 0 ? '+' : ''}${edgeDiff} edge${Math.abs(edgeDiff) !== 1 ? 's' : ''}`);
      newLogs.push(`${ts} → graph: ${parts.join(', ')} (${nodeCount}n ${edgeCount}e)`);
    } else if (code !== prev.code && newLogs.length === 0) {
      // Code changed but structure didn't — probably config/label/property edit
      const lineCount = code.split('\n').length;
      newLogs.push(`${ts} · edit: ${lineCount} lines`);
    }

    if (newLogs.length > 0) {
      setLogs(prev => [...prev.slice(-12), ...newLogs]);
    }
    lastState.current = { nodeCount, edgeCount, errorCount, warningCount, code };
  }, [code, nodeCount, edgeCount, errorCount, warningCount]);

  const handleClose = useCallback(
    () => onOpenChange(false),
    [onOpenChange],
  );

  const handleOpen = useCallback(
    () => onOpenChange(true),
    [onOpenChange],
  );

  const handleSwitchToCode = useCallback(
    () => onTabChange("code"),
    [onTabChange],
  );

  const handleSwitchToAi = useCallback(
    () => onTabChange("ai"),
    [onTabChange],
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
          {/* ── Section header ── */}
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
                onClick={handleSwitchToCode}
              />
              <TabButton
                active={activeTab === "ai"}
                icon={<Sparkles style={TAB_ICON_STYLE} />}
                label="ai"
                onClick={handleSwitchToAi}
              />
            </div>

            {/* Tab content */}
            {activeTab === "code" ? (
              <CodeTabContent
                presetsOpen={presetsOpen}
                onPresetsOpenChange={onPresetsOpenChange}
                activePreset={activePreset}
                onSelectPreset={onSelectPreset}
                onNewCode={onNewCode}
                presetsRef={presetsRef}
                errorCount={errorCount}
                editorChildren={editorChildren}
                logs={logs}
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