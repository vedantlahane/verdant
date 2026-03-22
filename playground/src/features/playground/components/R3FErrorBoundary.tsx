// features/playground/components/R3FErrorBoundary.tsx

import React from "react";
import { AlertTriangle } from "lucide-react";

// ── Constants ──

const MAX_AUTO_RETRIES = 3;
const ICON_SIZE = 32;

// ── Frozen styles (pattern 5) ──

const ICON_STYLE = Object.freeze({
  width: ICON_SIZE,
  height: ICON_SIZE,
  color: "var(--warm)",
} as const) as React.CSSProperties;

const ERROR_MSG_STYLE = Object.freeze({
  fontFamily: "var(--font-mono)",
  fontSize: "0.7rem",
  color: "var(--text-muted)",
  maxWidth: "20rem",
  textAlign: "center",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
} as const) as React.CSSProperties;

const CRASH_WARNING_STYLE = Object.freeze({
  fontFamily: "var(--font-mono)",
  fontSize: "0.6rem",
  color: "var(--warm)",
  marginTop: "0.25rem",
} as const) as React.CSSProperties;

const RETRY_BTN_STYLE = Object.freeze({
  marginTop: "0.5rem",
  fontSize: "0.75rem",
  padding: "0.5rem 1rem",
} as const) as React.CSSProperties;

// ── Types ──

interface Props {
  readonly children: React.ReactNode;
}

interface State {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly errorCount: number;
}

/**
 * Error boundary for the R3F canvas.
 *
 * Catches WebGL crashes, context loss, and renderer errors.
 * Shows a retry button with exponential backoff messaging
 * after multiple consecutive failures.
 */
export class R3FErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Verdant] Renderer error:", error);
      console.error("[Verdant] Component stack:", info.componentStack);
    }

    this.setState((prev) => ({ errorCount: prev.errorCount + 1 }));
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const canRetry = this.state.errorCount < MAX_AUTO_RETRIES;

      return (
        <div className="pg-empty">
          <AlertTriangle style={ICON_STYLE} />
          <span className="pg-empty-title">Renderer crashed.</span>
          <span style={ERROR_MSG_STYLE}>
            {this.state.error?.message ?? "Unknown error"}
          </span>
          {!canRetry && (
            <span style={CRASH_WARNING_STYLE}>
              Multiple crashes detected. Try refreshing the page.
            </span>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="btn-secondary"
            style={RETRY_BTN_STYLE}
          >
            {canRetry ? "Retry" : "Try again anyway"}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}