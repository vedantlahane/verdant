import React from "react";
import { AlertTriangle } from "lucide-react";

export class R3FErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Verdant Renderer Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
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
            }}
          >
            {this.state.error?.message}
          </span>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-secondary"
            style={{ marginTop: "0.5rem", fontSize: "0.75rem", padding: "0.5rem 1rem" }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}