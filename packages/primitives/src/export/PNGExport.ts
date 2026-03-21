export class ExportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ExportError';
  }
}

export interface PNGExportOptions {
  scale?: number; // 1–4, default 2
}

export interface SceneSnapshot {
  nodes: Array<{
    id: string;
    position: [number, number, number];
    label: string;
    color?: string;
    shape?: string;
  }>;
  edges: Array<{
    from: [number, number, number];
    to: [number, number, number];
    color?: string;
  }>;
  cameraPosition?: [number, number, number];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snapshotScene(snapshot: SceneSnapshot): SceneSnapshot {
  return {
    nodes: snapshot.nodes.map((n) => ({
      ...n,
      position: [...n.position] as [number, number, number],
    })),
    edges: snapshot.edges.map((e) => ({
      ...e,
      from: [...e.from] as [number, number, number],
      to: [...e.to] as [number, number, number],
    })),
    cameraPosition: snapshot.cameraPosition
      ? ([...snapshot.cameraPosition] as [number, number, number])
      : undefined,
  };
}

// Project 3D position to 2D canvas coordinates (simple orthographic)
function project(
  pos: [number, number, number],
  width: number,
  height: number,
  padding: number
): [number, number] {
  // Map x/y from scene space to canvas space; ignore z for 2D projection
  const cx = width / 2 + pos[0] * 40;
  const cy = height / 2 - pos[1] * 40;
  return [
    clamp(cx, padding, width - padding),
    clamp(cy, padding, height - padding),
  ];
}

export class PNGExport {
  /**
   * Exports the scene snapshot to a PNG blob.
   * Snapshots scene state before starting, never mutates live scene.
   * Rejects with ExportError on failure.
   */
  export(snapshot: SceneSnapshot, options?: PNGExportOptions): Promise<Blob> {
    // Snapshot immediately — never mutate the live scene
    const scene = snapshotScene(snapshot);

    return new Promise<Blob>((resolve, reject) => {
      try {
        const scale = clamp(options?.scale ?? 2, 1, 4);
        const baseWidth = 800;
        const baseHeight = 600;
        const width = baseWidth * scale;
        const height = baseHeight * scale;

        let canvas: HTMLCanvasElement | OffscreenCanvas;
        let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

        if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(width, height);
          ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
        } else {
          canvas = document.createElement('canvas');
          (canvas as HTMLCanvasElement).width = width;
          (canvas as HTMLCanvasElement).height = height;
          ctx = (canvas as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
        }

        if (!ctx) {
          reject(new ExportError('PNG export failed', new Error('Could not get 2D context')));
          return;
        }

        const padding = 40 * scale;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        // Draw edges
        for (const edge of scene.edges) {
          const [x1, y1] = project(edge.from, width, height, padding);
          const [x2, y2] = project(edge.to, width, height, padding);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = edge.color ?? '#888888';
          ctx.lineWidth = 2 * scale;
          ctx.stroke();
        }

        // Draw nodes
        const nodeRadius = 20 * scale;
        for (const node of scene.nodes) {
          const [x, y] = project(node.position, width, height, padding);

          // Circle
          ctx.beginPath();
          ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle = node.color ?? '#4a90d9';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 * scale;
          ctx.stroke();

          // Label
          ctx.fillStyle = '#ffffff';
          ctx.font = `${12 * scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.label, x, y + nodeRadius + 10 * scale);
        }

        if (canvas instanceof OffscreenCanvas) {
          canvas
            .convertToBlob({ type: 'image/png' })
            .then(resolve)
            .catch((err) => reject(new ExportError('PNG export failed', err)));
        } else {
          (canvas as HTMLCanvasElement).toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new ExportError('PNG export failed', new Error('toBlob returned null')));
            }
          }, 'image/png');
        }
      } catch (err) {
        reject(new ExportError('PNG export failed', err));
      }
    });
  }
}
