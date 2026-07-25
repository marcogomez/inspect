import type { TTFContour, TTFGlyph } from "./ttf-parser";

/**
 * Rasterizes a single glyph outline into a coverage buffer, writing 255 for
 * pixels inside the outline and leaving the rest at 0, with the scanline
 * polygon fill algorithm (Foley and van Dam, Computer Graphics: Principles and
 * Practice, 1990). Non-horizontal contour edges are collected once, then each
 * pixel row is filled between sorted edge crossings under the even-odd rule.
 * offsetX and offsetY place the glyph, with offsetY acting as the baseline.
 */
export function rasterizeGlyph(
  glyph: TTFGlyph,
  scale: number,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  buffer: Uint8Array
): void {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const contour of glyph.contours) {
    const pts = flattenContour(contour, scale, offsetX, offsetY);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (a.y !== b.y) {
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }
  }

  for (let y = 0; y < height; y++) {
    // 0.5 offset samples at pixel center for correct coverage
    const scanY = y + 0.5;
    const intersections: number[] = [];

    for (const edge of edges) {
      const { x1, y1, x2, y2 } = edge;
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      if (scanY < minY || scanY >= maxY) {
        continue;
      }
      const t = (scanY - y1) / (y2 - y1);
      intersections.push(x1 + t * (x2 - x1));
    }

    intersections.sort((a, b) => a - b);

    // even-odd rule: between each consecutive pair of sorted crossings the scanline is inside the outline
    for (let i = 0; i < intersections.length - 1; i += 2) {
      const xStart = Math.max(0, Math.ceil(intersections[i]));
      const xEnd = Math.min(width, Math.floor(intersections[i + 1]));
      for (let x = xStart; x < xEnd; x++) {
        buffer[y * width + x] = 255;
      }
    }
  }
}

/**
 * Flattens one contour into a polygon of scaled, y-flipped points. Off-curve
 * control points are expanded into quadratic bezier segments sampled from the
 * Bernstein form B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2, inserting the implied
 * midpoint that TrueType leaves between consecutive off-curve points.
 */
function flattenContour(
  contour: TTFContour,
  scale: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number }[] {
  const points = contour.points;
  if (points.length === 0) {
    return [];
  }

  const result: { x: number; y: number }[] = [];

  const expanded: { x: number; y: number; onCurve: boolean }[] = [];
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    expanded.push(curr);
    // TrueType implied on-curve point between consecutive off-curve points
    if (!curr.onCurve && !next.onCurve) {
      expanded.push({
        x: (curr.x + next.x) / 2,
        y: (curr.y + next.y) / 2,
        onCurve: true
      });
    }
  }

  for (let i = 0; i < expanded.length; i++) {
    const curr = expanded[i];
    if (curr.onCurve) {
      result.push({
        x: curr.x * scale + offsetX,
        y: -(curr.y * scale) + offsetY
      });
    } else {
      const prev = expanded[(i - 1 + expanded.length) % expanded.length];
      const next = expanded[(i + 1) % expanded.length];
      if (prev.onCurve && next.onCurve) {
        // 4 subdivisions balances accuracy vs vertex count for typical glyph curvature
        const steps = 4;
        for (let t = 1; t <= steps; t++) {
          const u = t / steps;
          const inv = 1 - u;
          const px = inv * inv * prev.x + 2 * inv * u * curr.x + u * u * next.x;
          const py = inv * inv * prev.y + 2 * inv * u * curr.y + u * u * next.y;
          result.push({
            x: px * scale + offsetX,
            y: -(py * scale) + offsetY
          });
        }
      }
    }
  }

  return result;
}
