"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import type { VrdAST } from "@verdant/parser";
import type { InspectorTarget } from "../types";

interface NodeInspectorProps {
  target: InspectorTarget;
  ast: VrdAST;
  onClose: () => void;
  onNavigateNode: (nodeId: string) => void;
}

const OFFSET = 16;
const CARD_W = 240;
const CARD_H = 300;

export function NodeInspector({
  target,
  ast,
  onClose,
  onNavigateNode,
}: NodeInspectorProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const node = useMemo(
    () => ast.nodes.find((n) => n.id === target.nodeId),
    [ast.nodes, target.nodeId],
  );

  const edges = useMemo(() => {
    const outgoing = ast.edges.filter((e) => e.from === target.nodeId);
    const incoming = ast.edges.filter((e) => e.to === target.nodeId);
    return { outgoing, incoming };
  }, [ast.edges, target.nodeId]);

  // ── Position: flip if too close to viewport edges ──
  const position = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
    const vh = typeof window !== "undefined" ? window.innerHeight : 900;

    const left =
      target.screenX + CARD_W + OFFSET > vw
        ? target.screenX - CARD_W - OFFSET
        : target.screenX + OFFSET;

    const top =
      target.screenY + CARD_H > vh
        ? Math.max(60, vh - CARD_H - 16)
        : Math.max(60, target.screenY - 40);

    return { left, top };
  }, [target.screenX, target.screenY]);

  // ── Close on Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        // Don't close if clicking on the canvas (node selection)
        const target = e.target as HTMLElement;
        if (target.closest("canvas")) return;
        onClose();
      }
    };
    // Delay to avoid closing on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  if (!node) return null;

  // Gather non-standard props for display
  const standardProps = new Set([
    "label", "color", "size", "glow", "icon", "position",
  ]);
  const customProps = Object.entries(node.props).filter(
    ([key, val]) => !standardProps.has(key) && val !== undefined,
  );

  return (
    <div
      ref={cardRef}
      className="pg-inspector"
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label={`Inspector: ${node.id}`}
    >
      {/* Header */}
      <div className="pg-inspector-header">
        <span className="section-label">// inspect</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
          }}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>

      <div className="pg-inspector-body">
        {/* Identity */}
        <InspectorRow label="type">
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
            {node.type}
          </span>
        </InspectorRow>
        <InspectorRow label="id">
          <span className="pg-inspector-row-val">{node.id}</span>
        </InspectorRow>

        {/* Standard props */}
        {node.props.label && (
          <InspectorRow label="label">
            <span className="pg-inspector-row-val">"{node.props.label}"</span>
          </InspectorRow>
        )}
        {node.props.size && (
          <InspectorRow label="size">
            <span className="pg-inspector-row-val">{node.props.size}</span>
          </InspectorRow>
        )}
        {node.props.glow !== undefined && (
          <InspectorRow label="glow">
            <span className="pg-inspector-row-val">{String(node.props.glow)}</span>
          </InspectorRow>
        )}
        {node.props.color && (
          <InspectorRow label="color">
            <span className="pg-inspector-row-val">
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  background: node.props.color,
                  marginRight: 4,
                  verticalAlign: "middle",
                  borderRadius: 1,
                }}
              />
              {node.props.color}
            </span>
          </InspectorRow>
        )}
        {node.groupId && (
          <InspectorRow label="group">
            <span className="pg-inspector-row-val">{node.groupId}</span>
          </InspectorRow>
        )}

        {/* Custom props */}
        {customProps.map(([key, val]) => (
          <InspectorRow key={key} label={key}>
            <span className="pg-inspector-row-val">{String(val)}</span>
          </InspectorRow>
        ))}

        {/* Edges */}
        {edges.outgoing.length > 0 && (
          <EdgeList
            title="outgoing"
            edges={edges.outgoing}
            idKey="to"
            prefix="→"
            onNavigate={onNavigateNode}
          />
        )}
        {edges.incoming.length > 0 && (
          <EdgeList
            title="incoming"
            edges={edges.incoming}
            idKey="from"
            prefix="←"
            onNavigate={onNavigateNode}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function InspectorRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pg-inspector-row">
      <span className="pg-inspector-row-key">{label}</span>
      {children}
    </div>
  );
}

function EdgeList({
  title,
  edges,
  idKey,
  prefix,
  onNavigate,
}: {
  title: string;
  edges: Array<{ from: string; to: string; props: any }>;
  idKey: "from" | "to";
  prefix: string;
  onNavigate: (nodeId: string) => void;
}) {
  return (
    <>
      <div className="pg-inspector-section">── {title} ──</div>
      {edges.map((e, i) => (
        <button
          key={`${idKey}-${i}`}
          className="pg-inspector-edge"
          onClick={() => onNavigate(e[idKey])}
        >
          {prefix} {e[idKey]}
          {e.props?.label && (
            <span
              style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}
            >
              "{e.props.label}"
            </span>
          )}
        </button>
      ))}
    </>
  );
}