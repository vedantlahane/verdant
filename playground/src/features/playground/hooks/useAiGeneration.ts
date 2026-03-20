"use client";

import { useCallback, useState } from "react";
import { parseVrdSafe } from "@verdant/parser";
import { toast } from "sonner";
import type { AiHistoryEntry } from "../types";

interface UseAiGenerationOptions {
  code: string;
  setCode: (code: string) => void;
  setActivePreset: (preset: string) => void;
  setSchemaTab: (tab: "code" | "ai") => void;
}

interface UseAiGenerationReturn {
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  isGenerating: boolean;
  aiError: string;
  aiHistory: AiHistoryEntry[];
  applyAi: () => Promise<void>;
  undoAi: (entryId: string) => void;
}

export function useAiGeneration({
  code,
  setCode,
  setActivePreset,
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

    // Parse ONCE before generation (not twice like before)
    const parseBefore = parseVrdSafe(code);
    const codeBefore = code;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currentCode: code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ||
            `Generation failed (${res.status})`,
        );
      }

      const data = (await res.json()) as { code?: string; error?: string };
      if (!data.code) throw new Error(data.error || "No code returned");

      const codeAfter = data.code;
      const parseAfter = parseVrdSafe(codeAfter);

      setCode(codeAfter);
      setActivePreset("");
      setSchemaTab("code");

      const entry: AiHistoryEntry = {
        id: crypto.randomUUID(),
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
  }, [aiPrompt, code, setCode, setActivePreset, setSchemaTab]);

  const undoAi = useCallback(
    (entryId: string) => {
      const idx = aiHistory.findIndex((h) => h.id === entryId);
      if (idx === -1) return;

      const entry = aiHistory[idx];

      // Restore the code from BEFORE this entry was applied
      setCode(entry.codeBefore);

      // Remove this entry and all entries that came after it (newer = lower index)
      setAiHistory((prev) => prev.slice(idx + 1));

      toast.success("Reverted to previous state");
    },
    [aiHistory, setCode],
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