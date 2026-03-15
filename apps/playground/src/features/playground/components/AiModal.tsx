import { X, Wand2, Loader2, AlertTriangle } from "lucide-react";

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  error?: string;
}

export function AiModal({
  isOpen,
  onClose,
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  error,
}: AiModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--accent-faint)]">
              <Wand2 className="h-4 w-4 text-[color:var(--accent-primary)]" />
            </div>
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
              Generate Architecture
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[color:var(--text-muted)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="mb-4 text-xs text-[color:var(--text-secondary)]">
            Describe the system you want to build. Our AI will generate the
            Verdant schema for you.
          </p>

          <textarea
            autoFocus
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="e.g. A microservices architecture with a Go API gateway, three Python services for auth, orders and inventory, and a shared PostgreSQL database."
            className="h-32 w-full resize-none rounded-xl border border-[color:var(--border-subtle)] bg-white/5 p-4 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-primary)]"
          />

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={onGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-2 rounded-xl bg-[color:var(--accent-primary)] px-6 py-2 text-xs font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Schema"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
