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
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <p className="text-sm font-medium text-[color:var(--text-primary)]">
            Renderer crashed
          </p>
          <p className="max-w-xs font-mono text-xs text-[color:var(--text-secondary)]">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 rounded-full border border-[color:var(--border-subtle)] px-4 py-2 text-xs transition hover:bg-white/5"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
