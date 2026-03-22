// features/playground/hooks/useAiGeneration.ts

"use client";

import { useCallback, useState } from "react";
import { parseVrdSafe } from "@verdant/parser";
import { toast } from "sonner";
import type { AiHistoryEntry, SchemaTab } from "../types";

// ── Options ──

interface UseAiGenerationOptions {
  readonly code: string;
  readonly setCode: (code: string) => void;
  readonly setSchemaTab: (tab: SchemaTab) => void;
}

// ── Return ──

interface UseAiGenerationReturn {
  readonly aiPrompt: string;
  readonly setAiPrompt: (prompt: string) => void;
  readonly isGenerating: boolean;
  readonly aiError: string;
  readonly aiHistory: readonly AiHistoryEntry[];
  readonly applyAi: () => Promise<void>;
  readonly undoAi: (entryId: string) => void;
}

// ── Helpers ──

/** Generate a unique ID, with fallback for environments without crypto */
const generateId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * AI-powered .vrd generation hook.
 *
 * Manages prompt state, API calls, history stack, and undo.
 * History is stored newest-first for display order.
 */
export function useAiGeneration({
  code,
  setCode,
  setSchemaTab,
}: UseAiGenerationOptions): UseAiGenerationReturn {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiHistory, setAiHistory] = useState<AiHistoryEntry[]>([]);

  const applyAi = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;

    setIsGenerating(true);
    setAiError("");

    const codeBefore = code;
    const parseBefore = parseVrdSafe(code);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currentCode: code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ??
            `Generation failed (${res.status})`,
        );
      }

      const data = (await res.json()) as { code?: string; error?: string };
      if (!data.code) throw new Error(data.error ?? "No code returned");

      const codeAfter = data.code;
      const parseAfter = parseVrdSafe(codeAfter);

      setCode(codeAfter);
      setSchemaTab("code");

      const entry: AiHistoryEntry = {
        id: generateId(),
        prompt,
        codeBefore,
        codeAfter,
        nodesBefore: parseBefore.ast.nodes.length,
        edgesBefore: parseBefore.ast.edges.length,
        nodesAfter: parseAfter.ast.nodes.length,
        edgesAfter: parseAfter.ast.edges.length,
        timestamp: Date.now(),
      };

      setAiHistory((prev) => [entry, ...prev]);
      setAiPrompt("");
      toast.success("Schema updated");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Generation failed";
      setAiError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [aiPrompt, code, setCode, setSchemaTab]);

  const undoAi = useCallback(
    (entryId: string) => {
      setAiHistory((prev) => {
        const idx = prev.findIndex((h) => h.id === entryId);
        if (idx === -1) return prev;

        const entry = prev[idx];
        setCode(entry.codeBefore);
        toast.success("Reverted to previous state");

        // Remove this entry and all newer entries (lower indices)
        return prev.slice(idx + 1);
      });
    },
    [setCode],
  );

  return {
    aiPrompt,
    setAiPrompt,
    isGenerating,
    aiError,
    aiHistory,
    applyAi,
    undoAi,
  };
}