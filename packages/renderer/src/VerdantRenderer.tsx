// VerdantRenderer.tsx

import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PrimitivesProvider } from '@verdant/primitives';
import type { PrimitivesConfig } from '@verdant/primitives';
import { Minimap, ContextMenu } from '@verdant/primitives';
import type { VrdConfig } from '@verdant/parser';
import { useRendererStore } from './store';
import { SceneContent } from './SceneContent';
import { CameraTracker } from './camera/CameraTracker';
import {
  getAstViewStorageKey,
  readViewState,
  writeViewState,
} from './store.persistence';
import type { VerdantRendererProps, PersistedViewState, Vec3, ContextMenuState, VerdantRendererHandle } from './types';

import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_TARGET,
  DPR_RANGE,
} from './constants';
import { VEC3_ORIGIN as ORIGIN } from './utils';

// ═══════════════════════════════════════════════════════════════════
//  AST Config → Primitives Config
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_BLOOM_INTENSITY = 1.0;
const DEFAULT_MAX_UNDO_HISTORY = 100;

/**
 * Convert a VRD AST config block into a PrimitivesProvider config.
 *
 * This is a pure function (no side effects, no hooks) so it can be
 * called in useMemo or in tests.
 */
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
//  WebGL Context Recovery
//
//  When the GPU resets (driver update, resource pressure, sleep/wake),
//  the WebGL context is lost. We listen for the browser's built-in
//  recovery events and remount the Canvas via a key increment.
//
//  The cleanup function returned by `onCreated` is NOT called by R3F
//  (it ignores the return value). So we manage listener cleanup
//  via a ref + useEffect in the component.
// ═══════════════════════════════════════════════════════════════════

function useWebGLRecovery(): {
  canvasKey: number;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  handleCreated: (state: any) => void;
} {
  const [canvasKey, setCanvasKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleCreated = useCallback((state: any) => {
    canvasRef.current = state.gl.domElement as HTMLCanvasElement;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (__DEV__) {
        console.warn(
          '[VerdantRenderer] WebGL context lost — will attempt recovery',
        );
      }
    };

    const handleContextRestored = () => {
      if (__DEV__) {
        console.info(
          '[VerdantRenderer] WebGL context restored — remounting canvas',
        );
      }
      setCanvasKey((k) => k + 1);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [canvasKey]); // Re-attach listeners when canvas remounts

  return { canvasKey, canvasRef, handleCreated };
}

const __DEV__ =
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV !== 'production';

// ═══════════════════════════════════════════════════════════════════
//  Context Menu Overlay
//
//  Extracted to prevent the full VerdantRenderer from re-rendering
//  when context menu state changes.
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
//
//  Subscribes to positions and ast independently so it only
//  re-renders when node positions actually change, not on every
//  hover/selection/camera event.
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

  const nodes = useMemo(() => {
    if (!ast) return [];
    return ast.nodes.map((node) => ({
      id: node.id,
      position: (positions[node.id] ?? ORIGIN) as [number, number, number],
      color: getNodeColor(
        node.type,
        node.props.color as string | undefined,
      ),
    }));
  }, [ast, positions, getNodeColor]);

  if (!config) return null;

  return <Minimap nodes={nodes} config={config} />;
});

// ═══════════════════════════════════════════════════════════════════
//  GL Configuration
// ═══════════════════════════════════════════════════════════════════

/** Frozen to avoid new object reference on every render */
const GL_CONFIG = Object.freeze({
  antialias: true,
  alpha: false,
  powerPreference: 'default' as const,
});

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════

/**
 * Top-level renderer component.
 *
 * Responsibilities:
 * - Canvas setup (WebGL config, DPR, camera)
 * - Store hydration (AST, theme)
 * - View state persistence (camera position/target/fov)
 * - DOM overlays (Minimap, ContextMenu) outside the R3F reconciler
 * - WebGL context loss recovery
 *
 * The 3D scene itself is delegated to SceneContent.
 */
/**
 * Top-level renderer component.
 */
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


  // ── WebGL recovery ──

  const { canvasKey, handleCreated } = useWebGLRecovery();

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

  // ── Primitives config ──

  const primitivesConfig = useMemo(
    () => astConfigToPrimitivesConfig(ast.config),
    [ast.config],
  );

  // ── External callbacks ──

  useExternalCallback(
    useRendererStore((s) => s.selectionSet),
    onSelectionChange,
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
        appliesTo: ['node', 'edge', 'group'] as Array<
          'node' | 'edge' | 'group' | 'canvas'
        >,
        handler: () => {
          selectNode(null);
        },
      },
      {
        id: 'duplicate-node',
        label: 'Duplicate node',
        appliesTo: ['node'] as Array<
          'node' | 'edge' | 'group' | 'canvas'
        >,
        handler: () => {
          // TODO: implement when store supports AST mutation
        },
      },
    ],
    [selectNode],
  );

  // ── Background color ──

  const bg = theme === 'light' ? '#ffffff' : '#000000';

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
        gl={GL_CONFIG}
        dpr={DPR_RANGE}
        onCreated={handleCreated}
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

      {/* DOM overlays — outside R3F reconciler */}
      {primitivesConfig.minimap?.enabled && (
        <MinimapOverlay config={primitivesConfig.minimap} />
      )}
      <ContextMenuOverlay actions={contextMenuActions} />
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Internal Hooks
// ═══════════════════════════════════════════════════════════════════

/** Frozen style for the Canvas element — avoids new object each render */
const CANVAS_STYLE: React.CSSProperties = Object.freeze({
  width: '100%',
  height: '100%',
});

/**
 * Fire an external callback when a store value changes.
 *
 * Avoids the pattern of:
 *   useEffect(() => { if (cb) cb(value); }, [value, cb]);
 *
 * Which has the subtle bug of firing on mount even when the value
 * hasn't "changed" — it's just being read for the first time.
 * This hook tracks the previous value and only fires on actual changes.
 */
function useExternalCallback<T>(value: T, callback?: (value: T) => void): void {
  const prevRef = useRef<T>(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial mount — the parent set the initial value,
    // so telling them about it is redundant
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRef.current = value;
      return;
    }

    // Only fire if the value actually changed
    if (prevRef.current === value) return;
    prevRef.current = value;

    callback?.(value);
  }, [value, callback]);
}