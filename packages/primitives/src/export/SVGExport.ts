import { ExportError, SceneSnapshot } from './PNGExport';

export interface SVGExportOptions {
  width?: number;
  height?: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

// Project 3D position to 2D SVG coordinates (simple orthographic)
function project(
  pos: [number, number, number],
  width: number,
  height: number,
  padding: number
): [number, number] {
  const cx = width / 2 + pos[0] * 40;
  const cy = height / 2 - pos[1] * 40;
  return [
    Math.max(padding, Math.min(width - padding, cx)),
    Math.max(padding, Math.min(height - padding, cy)),
  ];
}

export class SVGExport {
  /**
   * Exports the scene snapshot to an SVG string.
   * Snapshots scene state before starting, never mutates live scene.
   * Rejects with ExportError on failure.
   */
  export(snapshot: SceneSnapshot, options?: SVGExportOptions): Promise<string> {
    // Snapshot immediately — never mutate the live scene
    const scene = snapshotScene(snapshot);

    return new Promise<string>((resolve, reject) => {
      try {
        const width = options?.width ?? 800;
        const height = options?.height ?? 600;
        const padding = 40;
        const nodeRadius = 20;

        const lines: string[] = [];

        lines.push(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
        );

        // Background
        lines.push(
          `  <rect width="${width}" height="${height}" fill="#1a1a2e"/>`
        );

        // Edges
        for (const edge of scene.edges) {
          const [x1, y1] = project(edge.from, width, height, padding);
          const [x2, y2] = project(edge.to, width, height, padding);
          const color = escapeXml(edge.color ?? '#888888');
          lines.push(
            `  <line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="2"/>`
          );
        }

        // Nodes
        for (const node of scene.nodes) {
          const [x, y] = project(node.position, width, height, padding);
          const color = escapeXml(node.color ?? '#4a90d9');
          const label = escapeXml(node.label);

          lines.push(
            `  <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${nodeRadius}" fill="${color}" stroke="#ffffff" stroke-width="2"/>`
          );
          lines.push(
            `  <text x="${x.toFixed(2)}" y="${(y + nodeRadius + 14).toFixed(2)}" text-anchor="middle" fill="#ffffff" font-size="12" font-family="sans-serif">${label}</text>`
          );
        }

        lines.push('</svg>');

        resolve(lines.join('\n'));
      } catch (err) {
        reject(new ExportError('SVG export failed', err));
      }
    });
  }
}
