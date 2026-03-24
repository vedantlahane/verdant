// VerdantRenderer.tsx

import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PrimitivesProvider } from '@verdant/primitives';
import type { PrimitivesConfig } from '@verdant/primitives';
import { Minimap, ContextMenu } from '@verdant/primitives';
import type { VrdConfig } from '@verdant/parser';
import { useRendererStore, cancelPendingPersist } from './store';
import { SceneContent } from './SceneContent';
import { CameraTracker } from './camera/CameraTracker';
import { useRenderer } from './renderer/useRenderer';                  // ← NEW
import {
  getAstViewStorageKey,
  readViewState,
  writeViewState,
} from './store.persistence';
import { safeGroupWalk, setsEqual, VEC3_ORIGIN as ORIGIN } from './utils';
import type {
  VerdantRendererProps,
  PersistedViewState,
  Vec3,
  VerdantRendererHandle,
} from './types';
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_TARGET,
  DPR_RANGE,
} from './constants';
import { __DEV__ } from './shared';

// ═══════════════════════════════════════════════════════════════════
//  AST Config → Primitives Config
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_BLOOM_INTENSITY = 1.0;
const DEFAULT_MAX_UNDO_HISTORY = 100;

export function astConfigToPrimitivesConfig(
  config: VrdConfig,
): PrimitivesConfig {
  return {
    minimap: {
      enabled: config.minimap === true,
    },
    postProcessing: {
      enabled: config['post-processing'] === true,
      bloom: {
        intensity:
          typeof config['bloom-intensity'] === 'number'
            ? config['bloom-intensity']
            : DEFAULT_BLOOM_INTENSITY,
      },
    },
    maxUndoHistory: DEFAULT_MAX_UNDO_HISTORY,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Context Menu Overlay
// ═══════════════════════════════════════════════════════════════════

interface ContextMenuOverlayProps {
  readonly actions: React.ComponentProps<typeof ContextMenu>['actions'];
}

const ContextMenuOverlay = React.memo(function ContextMenuOverlay({
  actions,
}: ContextMenuOverlayProps) {
  const contextMenu = useRendererStore((s) => s.contextMenu);
  const closeContextMenu = useRendererStore((s) => s.closeContextMenu);

  return (
    <ContextMenu
      state={contextMenu}
      actions={actions}
      onClose={closeContextMenu}
    />
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Minimap Overlay
// ═══════════════════════════════════════════════════════════════════

interface MinimapOverlayProps {
  readonly config: PrimitivesConfig['minimap'];
}

const MinimapOverlay = React.memo(function MinimapOverlay({
  config,
}: MinimapOverlayProps) {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);
  const getNodeColor = useRendererStore((s) => s.getNodeColor);
  const themeColors = useRendererStore((s) => s.themeColors);

  const { nodes, edges, groups } = useMemo(() => {
    if (!ast) return { nodes: [], edges: [], groups: [] };

    const resNodes = ast.nodes.map((node) => ({
      id: node.id,
      position: (positions[node.id] ?? ORIGIN) as [number, number, number],
      color: getNodeColor(node.type, node.props.color as string | undefined),
    }));

    const resEdges = ast.edges.map((edge) => ({
      fromPosition: (positions[edge.from] ?? ORIGIN) as [number, number, number],
      toPosition: (positions[edge.to] ?? ORIGIN) as [number, number, number],
      color: themeColors.edgeDefault || 'rgba(255,255,255,0.25)',
    }));

    const resGroups: Array<{
      id: string;
      bounds: { min: [number, number]; max: [number, number] };
      color: string;
    }> = [];

    safeGroupWalk(ast.groups, (group) => {
      const nodeIds = [...group.children];
      safeGroupWalk(group.groups, (child) => {
        nodeIds.push(...child.children);
      });

      let minX = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxZ = -Infinity;
      let hasValid = false;

      for (const id of nodeIds) {
        const p = positions[id];
        if (!p) continue;
        hasValid = true;
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[2] < minZ) minZ = p[2];
        if (p[2] > maxZ) maxZ = p[2];
      }

      const padding = 2.5;
      resGroups.push({
        id: group.id,
        bounds: hasValid
          ? { min: [minX - padding, minZ - padding], max: [maxX + padding, maxZ + padding] }
          : { min: [0, 0], max: [0, 0] },
        color: themeColors.accent,
      });
    });

    return { nodes: resNodes, edges: resEdges, groups: resGroups };
  }, [ast, positions, getNodeColor, themeColors]);

  if (!config) return null;
  return <Minimap nodes={nodes} edges={edges} groups={groups} config={config} />;
});

// ═══════════════════════════════════════════════════════════════════
//  Canvas Style
// ═══════════════════════════════════════════════════════════════════

const CANVAS_STYLE: React.CSSProperties = Object.freeze({
  width: '100%',
  height: '100%',
});

// ═══════════════════════════════════════════════════════════════════
//  External Callback Hook (Bug #3 fix)
// ═══════════════════════════════════════════════════════════════════

function useExternalCallback<T>(
  value: T,
  callback?: (value: T) => void,
  isEqual?: (a: T, b: T) => boolean,
): void {
  const prevRef = useRef<T>(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRef.current = value;
      return;
    }

    const equal = isEqual
      ? isEqual(prevRef.current, value)
      : prevRef.current === value;

    if (equal) return;
    prevRef.current = value;
    callback?.(value);
  }, [value, callback, isEqual]);
}

// ═══════════════════════════════════════════════════════════════════
//  Main Component
//
//  Phase 3 changes:
//  - useWebGLRecovery() → useRenderer() (unified backend management)
//  - GL_CONFIG → glConfig from useRenderer (consistent with backend)
//  - Canvas key driven by useRenderer.canvasKey
//  - Backend reported via onBackendChange callback
// ═══════════════════════════════════════════════════════════════════

export const VerdantRenderer = React.forwardRef<
  VerdantRendererHandle,
  VerdantRendererProps
>(
  (
    {
      ast,
      theme = 'moss',
      width = '100%',
      height = '100%',
      className,
      autoRotate = true,
      showCoordinateSystem = true,
      preferWebGPU = true,
      onBackendDetected,
      onNodeClick,
      onCameraChange,
      onCursorMove,
      selectedNodeId,
      onSelectionChange,
      onUndoDepthChange,
    },
    ref,
  ) => {
    const setAst = useRendererStore((s) => s.setAst);
    const setTheme = useRendererStore((s) => s.setTheme);

    const sceneHandleRef = useRef<VerdantRendererHandle>(null);

    React.useImperativeHandle(
      ref,
      () => ({
        undo: () => sceneHandleRef.current?.undo(),
        redo: () => sceneHandleRef.current?.redo(),
        zoomToFit: () => sceneHandleRef.current?.zoomToFit(),
        resetCamera: () => sceneHandleRef.current?.resetCamera(),
      }),
      [],
    );

    // ── Renderer setup (replaces useWebGLRecovery) ──             ← CHANGED

    const {
      canvasKey,
      glConfig,
      handleCreated,
      backend,
      isDetected,
    } = useRenderer({
      config: {
        antialias: true,
        alpha: false,
        powerPreference: 'default',
      },
      preferWebGPU,
    });

    useEffect(() => {
      if (isDetected && onBackendDetected) {
        onBackendDetected(backend);
      }
    }, [isDetected, backend, onBackendDetected]);

    // ── View persistence ──

    const viewStorageKey = useMemo(
      () => getAstViewStorageKey(ast),
      [ast],
    );

    const initialView = useMemo(
      () => readViewState(viewStorageKey),
      [viewStorageKey],
    );

    const cameraPosition = useMemo<Vec3>(
      () => initialView?.position ?? DEFAULT_CAMERA_POSITION,
      [initialView],
    );

    const cameraFov = useMemo<number>(
      () => initialView?.fov ?? DEFAULT_CAMERA_FOV,
      [initialView],
    );

    const initialTarget = useMemo<Vec3>(
      () => initialView?.target ?? DEFAULT_CAMERA_TARGET,
      [initialView],
    );

    const handleViewChange = useCallback(
      (view: PersistedViewState) => {
        writeViewState(viewStorageKey, view);
      },
      [viewStorageKey],
    );

    // ── Store hydration ──

    useEffect(() => {
      setAst(ast);
    }, [ast, setAst]);

    useEffect(() => {
      setTheme(theme);
    }, [theme, setTheme]);

    useEffect(() => {
      return () => {
        cancelPendingPersist();
      };
    }, []);

    // ── Primitives config ──

    const primitivesConfig = useMemo(
      () => astConfigToPrimitivesConfig(ast.config),
      [ast.config],
    );

    // ── External callbacks ──

    useExternalCallback(
      useRendererStore((s) => s.selectionSet),
      onSelectionChange,
      setsEqual as (a: ReadonlySet<string>, b: ReadonlySet<string>) => boolean,
    );

    useExternalCallback(
      useRendererStore((s) => s.undoDepth),
      onUndoDepthChange,
    );

    // ── Context menu actions ──

    const selectNode = useRendererStore((s) => s.selectNode);

    const contextMenuActions = useMemo(
      () => [
        {
          id: 'delete-selected',
          label: 'Delete selected',
          appliesTo: ['node', 'edge', 'group'] as Array<'node' | 'edge' | 'group' | 'canvas'>,
          handler: () => { selectNode(null); },
        },
        {
          id: 'duplicate-node',
          label: 'Duplicate node',
          appliesTo: ['node'] as Array<'node' | 'edge' | 'group' | 'canvas'>,
          handler: () => { /* TODO */ },
        },
      ],
      [selectNode],
    );

    // ── Background color ──

    const themeColors = useRendererStore((s) => s.themeColors);
    // TODO: Add sceneBg to ThemeColors type in @verdant/themes if background customization is needed
    const bg = (themeColors as any).sceneBg ?? (theme === 'light' ? '#ffffff' : '#000000');

    // ── Container style ──

    const containerStyle = useMemo<React.CSSProperties>(
      () => ({
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
      }),
      [width, height],
    );

    return (
      <div className={className} style={containerStyle}>
        <Canvas
          key={canvasKey}
          style={CANVAS_STYLE}
          camera={{ position: cameraPosition, fov: cameraFov }}
          gl={glConfig}
          dpr={DPR_RANGE}
          onCreated={handleCreated}
          frameloop={backend === 'webgpu' ? 'demand' : 'always'}
        >
          <color attach="background" args={[bg]} />
          <PrimitivesProvider config={primitivesConfig}>
            <SceneContent
              ref={sceneHandleRef}
              autoRotate={autoRotate}
              showCoordinateSystem={showCoordinateSystem}
              onNodeClick={onNodeClick}
              onCursorMove={onCursorMove}
              selectedNodeId={selectedNodeId}
              initialTarget={initialTarget}
              onViewChange={handleViewChange}
            />
            {onCameraChange && (
              <CameraTracker onCameraChange={onCameraChange} />
            )}
          </PrimitivesProvider>
        </Canvas>

        {primitivesConfig.minimap?.enabled && (
          <MinimapOverlay config={primitivesConfig.minimap} />
        )}
        <ContextMenuOverlay actions={contextMenuActions} />
      </div>
    );
  },
);

VerdantRenderer.displayName = 'VerdantRenderer';