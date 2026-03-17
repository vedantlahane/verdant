"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { VrdAST } from "@repo/parser";
import type { InspectorTarget } from "../PlaygroundApp";

interface NodeInspectorProps {
  target: InspectorTarget;
  ast: VrdAST;
  onClose: () => void;
  onNavigateNode: (nodeId: string) => void;
}

export function NodeInspector({
  target,
  ast,
  onClose,
  onNavigateNode,
}: NodeInspectorProps) {
  const node = useMemo(
    () => ast.nodes.find((n) => n.id === target.nodeId),
    [ast, target.nodeId],
  );

  const edges = useMemo(() => {
    const outgoing = ast.edges.filter((e) => e.from === target.nodeId);
    const incoming = ast.edges.filter((e) => e.to === target.nodeId);
    return { outgoing, incoming };
  }, [ast, target.nodeId]);

  if (!node) return null;

  // Position the inspector card near the node's screen position
  // Offset slightly so it doesn't cover the node
  const OFFSET = 16;
  const CARD_W = 240;
  const CARD_H = 300; // approximate max

  // Flip if too close to edges
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

  return (
    <div className="pg-inspector" style={{ left, top }}>
      {/* Header */}
      <div className="pg-inspector-header">
        <span className="section-label">// inspect</span>
        <button
          type="button"
          onClick={onClose}
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
        {/* Type + ID */}
        <div className="pg-inspector-row">
          <span className="pg-inspector-row-key">type</span>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
            {node.type}
          </span>
        </div>
        <div className="pg-inspector-row">
          <span className="pg-inspector-row-key">id</span>
          <span className="pg-inspector-row-val">{node.id}</span>
        </div>

        {/* Props */}
        {node.props.label && (
          <div className="pg-inspector-row">
            <span className="pg-inspector-row-key">label</span>
            <span className="pg-inspector-row-val">"{node.props.label}"</span>
          </div>
        )}
        {node.props.size && (
          <div className="pg-inspector-row">
            <span className="pg-inspector-row-key">size</span>
            <span className="pg-inspector-row-val">{node.props.size}</span>
          </div>
        )}
        {node.props.glow !== undefined && (
          <div className="pg-inspector-row">
            <span className="pg-inspector-row-key">glow</span>
            <span className="pg-inspector-row-val">
              {String(node.props.glow)}
            </span>
          </div>
        )}
        {node.props.color && (
          <div className="pg-inspector-row">
            <span className="pg-inspector-row-key">color</span>
            <span className="pg-inspector-row-val">
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  background: node.props.color,
                  marginRight: 4,
                  verticalAlign: "middle",
                }}
              />
              {node.props.color}
            </span>
          </div>
        )}
        {node.groupId && (
          <div className="pg-inspector-row">
            <span className="pg-inspector-row-key">group</span>
            <span className="pg-inspector-row-val">{node.groupId}</span>
          </div>
        )}

        {/* Outgoing edges */}
        {edges.outgoing.length > 0 && (
          <>
            <div className="pg-inspector-section">── outgoing ──</div>
            {edges.outgoing.map((e, i) => (
              <button
                key={`out-${i}`}
                className="pg-inspector-edge"
                onClick={() => onNavigateNode(e.to)}
              >
                → {e.to}
                {e.props?.label && (
                  <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                    "{e.props.label}"
                  </span>
                )}
              </button>
            ))}
          </>
        )}

        {/* Incoming edges */}
        {edges.incoming.length > 0 && (
          <>
            <div className="pg-inspector-section">── incoming ──</div>
            {edges.incoming.map((e, i) => (
              <button
                key={`in-${i}`}
                className="pg-inspector-edge"
                onClick={() => onNavigateNode(e.from)}
              >
                ← {e.from}
                {e.props?.label && (
                  <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                    "{e.props.label}"
                  </span>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}