// features/playground/components/NodeInspector.tsx

"use client";

import { useMemo, useEffect, useRef, useCallback, useState, memo } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { printVrd } from "@verdant/parser";
import type { VrdAST, BadgePosition, PortSide } from "@verdant/parser";
import type { InspectorTarget } from "../types";

// ── Types ──

interface NodeInspectorProps {
  readonly target: InspectorTarget;
  readonly ast: VrdAST;
  readonly setCode: (code: string) => void;
  readonly onClose: () => void;
  readonly onNavigateNode: (nodeId: string) => void;
}

// ── Constants (frozen, pattern 8) ──

/** Card positioning offset from click point in px */
const OFFSET_PX = 16;
const CARD_WIDTH = 260;
const CARD_HEIGHT = 420;
/** Minimum top position to avoid topbar overlap */
const MIN_TOP = 60;
/** Delay before outside-click listener activates in ms */
const OUTSIDE_CLICK_DELAY_MS = 100;

const STATUS_OPTIONS = Object.freeze([
  "none", "healthy", "warning", "error", "unknown",
] as const);

const ROUTING_OPTIONS = Object.freeze([
  "straight", "curved", "orthogonal",
] as const);

const BADGE_POSITIONS: readonly BadgePosition[] = Object.freeze([
  "top-right", "top-left", "bottom-right", "bottom-left",
]);

const PORT_SIDES: readonly PortSide[] = Object.freeze([
  "top", "bottom", "left", "right", "front", "back",
]);

/** Props that are displayed in the identity/standard section */
const STANDARD_PROPS = Object.freeze(new Set([
  "label", "color", "size", "glow", "icon", "position",
  "status", "badges", "ports", "shape",
  "enterAnimation", "exitAnimation", "animationDuration",
]));

// ── Frozen styles (pattern 5) ──

const CLOSE_BTN_STYLE = Object.freeze({
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  padding: "0.25rem",
  display: "flex",
} as const) as React.CSSProperties;

const CLOSE_ICON_STYLE = Object.freeze({
  width: 12,
  height: 12,
} as const) as React.CSSProperties;

const COLOR_SWATCH_BASE = Object.freeze({
  display: "inline-block",
  width: 8,
  height: 8,
  marginRight: 4,
  verticalAlign: "middle",
  borderRadius: 1,
} as const) as React.CSSProperties;

const ICON_BTN_STYLE = Object.freeze({
  background: "none",
  border: "1px solid var(--border)",
  color: "var(--text-muted)",
  cursor: "pointer",
  padding: "2px 4px",
  borderRadius: 3,
  display: "flex",
  alignItems: "center",
} as const) as React.CSSProperties;

const SMALL_ICON_STYLE = Object.freeze({
  width: 10,
  height: 10,
} as const) as React.CSSProperties;

const ROW_GAP_STYLE = Object.freeze({
  gap: 4,
} as const) as React.CSSProperties;

const ROW_GAP_WRAP_STYLE = Object.freeze({
  gap: 4,
  flexWrap: "wrap",
} as const) as React.CSSProperties;

const EDITOR_SECTION_STYLE = Object.freeze({
  marginBottom: 4,
} as const) as React.CSSProperties;

const EDGE_BLOCK_STYLE = Object.freeze({
  marginBottom: 6,
} as const) as React.CSSProperties;

const EDGE_LABEL_BTN_STYLE = Object.freeze({
  marginBottom: 4,
} as const) as React.CSSProperties;

const EDGE_LABEL_MUTED_STYLE = Object.freeze({
  color: "var(--text-muted)",
  marginLeft: "0.5rem",
} as const) as React.CSSProperties;

const INPUT_WIDTH_60 = Object.freeze({ width: 60 } as const) as React.CSSProperties;
const INPUT_WIDTH_70 = Object.freeze({ width: 70 } as const) as React.CSSProperties;
const FLEX_AUTO_STYLE = Object.freeze({ flex: "0 0 auto" } as const) as React.CSSProperties;
const FLEX_GROW_STYLE = Object.freeze({ flex: 1, minWidth: 40 } as const) as React.CSSProperties;

// ── Pure helpers (module-level) ──

/** Calculate inspector card position, flipping if too close to viewport edge */
function computeCardPosition(
  screenX: number,
  screenY: number,
): { readonly left: number; readonly top: number } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  const left =
    screenX + CARD_WIDTH + OFFSET_PX > vw
      ? screenX - CARD_WIDTH - OFFSET_PX
      : screenX + OFFSET_PX;

  const top =
    screenY + CARD_HEIGHT > vh
      ? Math.max(MIN_TOP, vh - CARD_HEIGHT - 16)
      : Math.max(MIN_TOP, screenY - 40);

  return { left, top };
}

// ── Sub-components ──

const InspectorRow = memo(function InspectorRow({
  label,
  children,
  style,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}) {
  return (
    <div className="pg-inspector-row" style={style}>
      <span className="pg-inspector-row-key">{label}</span>
      {children}
    </div>
  );
});

function BadgesEditor({
  badges,
  onAdd,
  onRemove,
}: {
  readonly badges: ReadonlyArray<{ position: BadgePosition; content: string }>;
  readonly onAdd: (pos: BadgePosition, content: string) => void;
  readonly onRemove: (i: number) => void;
}) {
  const [newPos, setNewPos] = useState<BadgePosition>("top-right");
  const [newContent, setNewContent] = useState("");

  const handleAdd = useCallback(() => {
    const trimmed = newContent.trim();
    if (trimmed) {
      onAdd(newPos, trimmed);
      setNewContent("");
    }
  }, [newPos, newContent, onAdd]);

  return (
    <div style={EDITOR_SECTION_STYLE}>
      <div className="pg-inspector-section">── badges ──</div>
      {badges.map((b, i) => (
        <div key={i} className="pg-inspector-row" style={ROW_GAP_STYLE}>
          <span className="pg-inspector-row-key">{b.position}</span>
          <span className="pg-inspector-row-val" style={FLEX_GROW_STYLE}>
            {b.content}
          </span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove badge ${b.position}`}
            style={ICON_BTN_STYLE}
          >
            <Trash2 style={SMALL_ICON_STYLE} />
          </button>
        </div>
      ))}
      <div className="pg-inspector-row" style={ROW_GAP_WRAP_STYLE}>
        <select
          className="pg-inspector-select"
          value={newPos}
          onChange={(e) => setNewPos(e.target.value as BadgePosition)}
          aria-label="Badge position"
          style={FLEX_AUTO_STYLE}
        >
          {BADGE_POSITIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          className="pg-inspector-input"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="content"
          aria-label="Badge content"
          style={FLEX_GROW_STYLE}
        />
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Add badge"
          style={ICON_BTN_STYLE}
        >
          <Plus style={SMALL_ICON_STYLE} />
        </button>
      </div>
    </div>
  );
}

function PortsEditor({
  ports,
  onAdd,
  onRemove,
}: {
  readonly ports: ReadonlyArray<{ name: string; side: PortSide }>;
  readonly onAdd: (name: string, side: PortSide) => void;
  readonly onRemove: (i: number) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newSide, setNewSide] = useState<PortSide>("top");

  const handleAdd = useCallback(() => {
    const trimmed = newName.trim();
    if (trimmed) {
      onAdd(trimmed, newSide);
      setNewName("");
    }
  }, [newName, newSide, onAdd]);

  return (
    <div style={EDITOR_SECTION_STYLE}>
      <div className="pg-inspector-section">── ports ──</div>
      {ports.map((p, i) => (
        <div key={i} className="pg-inspector-row" style={ROW_GAP_STYLE}>
          <span className="pg-inspector-row-key">{p.name}</span>
          <span className="pg-inspector-row-val" style={FLEX_GROW_STYLE}>
            {p.side}
          </span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove port ${p.name}`}
            style={ICON_BTN_STYLE}
          >
            <Trash2 style={SMALL_ICON_STYLE} />
          </button>
        </div>
      ))}
      <div className="pg-inspector-row" style={ROW_GAP_WRAP_STYLE}>
        <input
          className="pg-inspector-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="name"
          aria-label="Port name"
          style={FLEX_GROW_STYLE}
        />
        <select
          className="pg-inspector-select"
          value={newSide}
          onChange={(e) => setNewSide(e.target.value as PortSide)}
          aria-label="Port side"
          style={FLEX_AUTO_STYLE}
        >
          {PORT_SIDES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Add port"
          style={ICON_BTN_STYLE}
        >
          <Plus style={SMALL_ICON_STYLE} />
        </button>
      </div>
    </div>
  );
}

function EdgeEditor({
  edge,
  label,
  onUpdate,
  onNavigate,
}: {
  readonly edge: VrdAST["edges"][number];
  readonly label: string;
  readonly onUpdate: (updater: (e: VrdAST["edges"][number]) => void) => void;
  readonly onNavigate: () => void;
}) {
  const p = edge.props;

  const handleRoutingChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdate((ed) => {
        ed.props.routing = e.target.value as typeof ROUTING_OPTIONS[number];
      });
    },
    [onUpdate],
  );

  const handleFlowToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate((ed) => {
        ed.props.flow = e.target.checked;
      });
    },
    [onUpdate],
  );

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate((ed) => {
        const v = parseFloat(e.target.value);
        ed.props.flowSpeed = Number.isFinite(v) ? v : undefined;
      });
    },
    [onUpdate],
  );

  const handleCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate((ed) => {
        const v = parseInt(e.target.value, 10);
        ed.props.flowCount = Number.isInteger(v) && v > 0 ? v : undefined;
      });
    },
    [onUpdate],
  );

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate((ed) => {
        ed.props.flowColor = e.target.value || undefined;
      });
    },
    [onUpdate],
  );

  return (
    <div style={EDGE_BLOCK_STYLE}>
      <button
        className="pg-inspector-edge"
        onClick={onNavigate}
        style={EDGE_LABEL_BTN_STYLE}
      >
        {label}
        {p.label && (
          <span style={EDGE_LABEL_MUTED_STYLE}>"{p.label}"</span>
        )}
      </button>

      <InspectorRow label="routing">
        <select
          className="pg-inspector-select"
          value={p.routing ?? "straight"}
          onChange={handleRoutingChange}
          aria-label="Edge routing"
        >
          {ROUTING_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </InspectorRow>

      <InspectorRow label="flow">
        <input
          type="checkbox"
          checked={p.flow ?? false}
          onChange={handleFlowToggle}
          aria-label="Enable flow"
        />
      </InspectorRow>

      <InspectorRow label="speed">
        <input
          type="number"
          className="pg-inspector-input"
          value={p.flowSpeed ?? ""}
          min={0}
          step={0.1}
          placeholder="1"
          onChange={handleSpeedChange}
          aria-label="Flow speed"
          style={INPUT_WIDTH_60}
        />
      </InspectorRow>

      <InspectorRow label="count">
        <input
          type="number"
          className="pg-inspector-input"
          value={p.flowCount ?? ""}
          min={1}
          step={1}
          placeholder="5"
          onChange={handleCountChange}
          aria-label="Flow count"
          style={INPUT_WIDTH_60}
        />
      </InspectorRow>

      <InspectorRow label="color">
        <input
          type="text"
          className="pg-inspector-input"
          value={p.flowColor ?? ""}
          placeholder="#fff"
          onChange={handleColorChange}
          aria-label="Flow color"
          style={INPUT_WIDTH_70}
        />
      </InspectorRow>
    </div>
  );
}

// ── Main component ──

/**
 * Node inspector panel — positioned near clicked node.
 *
 * Shows node identity, properties, badges, ports, group info,
 * and connected edge controls with inline editing.
 *
 * Changes are applied by re-printing the AST via `printVrd`.
 */
export function NodeInspector({
  target,
  ast,
  setCode,
  onClose,
  onNavigateNode,
}: NodeInspectorProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Lookup maps (O(1) instead of linear scan per render) ──

  const nodeMap = useMemo(() => {
    const map = new Map<string, VrdAST["nodes"][number]>();
    for (const n of ast.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [ast.nodes]);

  const node = nodeMap.get(target.nodeId) ?? null;

  const { outgoingWithIndex, incomingWithIndex } = useMemo(() => {
    const outgoing: Array<{ edge: VrdAST["edges"][number]; index: number }> = [];
    const incoming: Array<{ edge: VrdAST["edges"][number]; index: number }> = [];
    for (let i = 0; i < ast.edges.length; i++) {
      const e = ast.edges[i];
      if (e.from === target.nodeId) outgoing.push({ edge: e, index: i });
      if (e.to === target.nodeId) incoming.push({ edge: e, index: i });
    }
    return { outgoingWithIndex: outgoing, incomingWithIndex: incoming };
  }, [ast.edges, target.nodeId]);

  // Find group containing this node
  const group = useMemo(() => {
    function findGroup(
      groups: VrdAST["groups"],
    ): VrdAST["groups"][number] | null {
      for (const g of groups) {
        if (g.children.includes(target.nodeId)) return g;
        const nested = findGroup(g.groups);
        if (nested) return nested;
      }
      return null;
    }
    return findGroup(ast.groups);
  }, [ast.groups, target.nodeId]);

  // ── Position ──
  const position = useMemo(
    () => computeCardPosition(target.screenX, target.screenY),
    [target.screenX, target.screenY],
  );

  // ── Outside click (delayed activation to avoid click-through) ──
  useEffect(() => {
    let active = false;

    const handler = (e: MouseEvent): void => {
      if (!active) return;
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        // Don't close when clicking on the canvas (re-selecting nodes)
        const t = e.target as HTMLElement;
        if (t.closest("canvas")) return;
        onClose();
      }
    };

    const timer = setTimeout(() => {
      active = true;
    }, OUTSIDE_CLICK_DELAY_MS);

    document.addEventListener("mousedown", handler);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  // ── AST mutation helpers ──

  const updateNode = useCallback(
    (updater: (n: VrdAST["nodes"][number]) => void) => {
      const newAst: VrdAST = {
        ...ast,
        nodes: ast.nodes.map((n) => {
          if (n.id !== target.nodeId) return n;
          const copy = { ...n, props: { ...n.props } };
          updater(copy);
          return copy;
        }),
      };
      setCode(printVrd(newAst));
    },
    [ast, target.nodeId, setCode],
  );

  const updateEdge = useCallback(
    (edgeIndex: number, updater: (e: VrdAST["edges"][number]) => void) => {
      const newAst: VrdAST = {
        ...ast,
        edges: ast.edges.map((e, i) => {
          if (i !== edgeIndex) return e;
          const copy = { ...e, props: { ...e.props } };
          updater(copy);
          return copy;
        }),
      };
      setCode(printVrd(newAst));
    },
    [ast, setCode],
  );

  const updateGroup = useCallback(
    (groupId: string, updater: (g: VrdAST["groups"][number]) => void) => {
      function mapGroups(groups: VrdAST["groups"]): VrdAST["groups"] {
        return groups.map((g) => {
          if (g.id === groupId) {
            const copy = { ...g, props: { ...g.props } };
            updater(copy);
            return copy;
          }
          return { ...g, groups: mapGroups(g.groups) };
        });
      }
      const newAst: VrdAST = { ...ast, groups: mapGroups(ast.groups) };
      setCode(printVrd(newAst));
    },
    [ast, setCode],
  );

  // ── Status change handler ──
  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      updateNode((n) => {
        if (val === "none") {
          delete n.props.status;
        } else {
          (n.props as Record<string, unknown>).status = val;
        }
      });
    },
    [updateNode],
  );

  // ── Badge handlers ──
  const handleBadgeAdd = useCallback(
    (pos: BadgePosition, content: string) => {
      updateNode((n) => {
        n.props.badges = [...(n.props.badges ?? []), { position: pos, content }];
      });
    },
    [updateNode],
  );

  const handleBadgeRemove = useCallback(
    (i: number) => {
      updateNode((n) => {
        n.props.badges = (n.props.badges ?? []).filter((_, idx) => idx !== i);
      });
    },
    [updateNode],
  );

  // ── Port handlers ──
  const handlePortAdd = useCallback(
    (name: string, side: PortSide) => {
      updateNode((n) => {
        n.props.ports = [...(n.props.ports ?? []), { name, side }];
      });
    },
    [updateNode],
  );

  const handlePortRemove = useCallback(
    (i: number) => {
      updateNode((n) => {
        n.props.ports = (n.props.ports ?? []).filter((_, idx) => idx !== i);
      });
    },
    [updateNode],
  );

  // ── Group collapse handler ──
  const handleCollapseToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!group) return;
      updateGroup(group.id, (g) => {
        g.props.collapsed = e.target.checked;
      });
    },
    [group, updateGroup],
  );

  // ── Bail if node not found ──
  if (!node) return null;

  // Custom props (non-standard)
  const customProps = Object.entries(node.props).filter(
    ([key, val]) => !STANDARD_PROPS.has(key) && val !== undefined,
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
          style={CLOSE_BTN_STYLE}
        >
          <X style={CLOSE_ICON_STYLE} />
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
            <span className="pg-inspector-row-val">
              {String(node.props.glow)}
            </span>
          </InspectorRow>
        )}
        {node.props.color && (
          <InspectorRow label="color">
            <span className="pg-inspector-row-val">
              <span
                style={{
                  ...COLOR_SWATCH_BASE,
                  background: node.props.color,
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

        {/* Status dropdown */}
        <div className="pg-inspector-section">── node props ──</div>
        <InspectorRow label="status">
          <select
            className="pg-inspector-select"
            value={node.props.status ?? "none"}
            onChange={handleStatusChange}
            aria-label="Node status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </InspectorRow>

        {/* Badges */}
        <BadgesEditor
          badges={node.props.badges ?? []}
          onAdd={handleBadgeAdd}
          onRemove={handleBadgeRemove}
        />

        {/* Ports */}
        <PortsEditor
          ports={node.props.ports ?? []}
          onAdd={handlePortAdd}
          onRemove={handlePortRemove}
        />

        {/* Group collapse toggle */}
        {group && (
          <>
            <div className="pg-inspector-section">── group ──</div>
            <InspectorRow label="collapsed">
              <input
                type="checkbox"
                checked={group.props.collapsed ?? false}
                onChange={handleCollapseToggle}
                aria-label="Collapse group"
              />
            </InspectorRow>
          </>
        )}

        {/* Outgoing edges */}
        {outgoingWithIndex.length > 0 && (
          <>
            <div className="pg-inspector-section">── outgoing edges ──</div>
            {outgoingWithIndex.map(({ edge, index }) => (
              <EdgeEditor
                key={`out-${index}`}
                edge={edge}
                label={`→ ${edge.to}`}
                onUpdate={(updater) => updateEdge(index, updater)}
                onNavigate={() => onNavigateNode(edge.to)}
              />
            ))}
          </>
        )}

        {/* Incoming edges */}
        {incomingWithIndex.length > 0 && (
          <>
            <div className="pg-inspector-section">── incoming ──</div>
            {incomingWithIndex.map(({ edge }, i) => (
              <button
                key={`in-${i}`}
                className="pg-inspector-edge"
                onClick={() => onNavigateNode(edge.from)}
              >
                ← {edge.from}
                {edge.props?.label && (
                  <span style={EDGE_LABEL_MUTED_STYLE}>
                    "{edge.props.label}"
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