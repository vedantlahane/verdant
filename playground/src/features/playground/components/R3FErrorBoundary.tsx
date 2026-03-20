import React from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

const MAX_AUTO_RETRIES = 3;

export class R3FErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[Verdant] Renderer error:", error);
    console.error("[Verdant] Component stack:", info.componentStack);

    // Track error count for auto-retry limit
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
          <AlertTriangle
            style={{ width: 32, height: 32, color: "var(--warm)" }}
          />
          <span className="pg-empty-title">Renderer crashed.</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              maxWidth: "20rem",
              textAlign: "center",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {this.state.error?.message ?? "Unknown error"}
          </span>
          {!canRetry && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6rem",
                color: "var(--warm)",
                marginTop: "0.25rem",
              }}
            >
              Multiple crashes detected. Try refreshing the page.
            </span>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="btn-secondary"
            style={{
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              padding: "0.5rem 1rem",
            }}
          >
            {canRetry ? "Retry" : "Try again anyway"}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}