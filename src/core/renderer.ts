import type { FontAtlas, TextureAtlas } from "./atlas";

/**
 * Abstract drawing backend for the widget system.
 * Supports filled/stroked primitives, text, clipping, alpha, and transforms.
 */
export interface Renderer {
  /** starts a full-frame pass, clearing the whole target to transparent. */
  begin(width: number, height: number): void;
  /** starts a partial pass clipped to the given rect, clearing only that region. */
  beginPartial(x: number, y: number, width: number, height: number): void;
  /** ends the current pass, restoring any state saved by beginPartial. */
  end(): void;

  /** fills an axis-aligned rectangle with a packed RGBA color (0xRRGGBBAA). */
  fillRect(x: number, y: number, width: number, height: number, color: number): void;
  /** strokes a rectangle outline centered on its edges with the given line width. */
  strokeRect(x: number, y: number, width: number, height: number, color: number, lineWidth: number): void;
  /** fills a rectangle with corners rounded to radius (clamped to half the smaller side). */
  fillRoundedRect(x: number, y: number, width: number, height: number, radius: number, color: number): void;
  /** strokes a rounded-rectangle outline. */
  strokeRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: number,
    lineWidth: number
  ): void;
  /** blits a source sub-region of an atlas image into a destination rectangle. */
  drawImage(
    atlas: TextureAtlas,
    srcX: number,
    srcY: number,
    srcWidth: number,
    srcHeight: number,
    dstX: number,
    dstY: number,
    dstWidth: number,
    dstHeight: number
  ): void;
  /** draws monospace text with top-left at (x, y), recolored, with optional scale and letter spacing. */
  drawText(
    atlas: FontAtlas,
    text: string,
    x: number,
    y: number,
    color: number,
    scale?: number,
    letterSpacing?: number
  ): void;
  /** strokes a straight line between two points. */
  drawLine(x1: number, y1: number, x2: number, y2: number, color: number, lineWidth: number): void;
  /** fills a circle at (cx, cy). */
  fillCircle(cx: number, cy: number, radius: number, color: number): void;
  /** strokes a circle outline at (cx, cy). */
  strokeCircle(cx: number, cy: number, radius: number, color: number, lineWidth: number): void;
  /** strokes a circular arc from startAngle to endAngle (radians), with an optional line cap. */
  strokeArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: number,
    lineWidth: number,
    lineCap?: "butt" | "round" | "square"
  ): void;

  /** starts a new path for the moveTo/lineTo/strokePath/fillPath primitives. */
  beginPath(): void;
  /** starts a new subpath at the given point. */
  moveTo(x: number, y: number): void;
  /** adds a straight segment from the current point to the given point. */
  lineTo(x: number, y: number): void;
  /** strokes the current path. */
  strokePath(color: number, lineWidth: number): void;
  /** fills the current path. */
  fillPath(color: number): void;

  /** pushes a rectangular clip region onto the clip stack. */
  pushClip(x: number, y: number, width: number, height: number): void;
  /** pops the most recently pushed clip region. */
  popClip(): void;
  /** pushes a translation and a clip rect (in the translated space) as one stack entry. */
  pushTranslateClip(tx: number, ty: number, cx: number, cy: number, cw: number, ch: number): void;
  /** pops a pushTranslateClip entry. */
  popTranslateClip(): void;
  /** multiplies the current alpha by the given factor and pushes the previous value. */
  pushAlpha(alpha: number): void;
  /** restores the alpha saved by the matching pushAlpha. */
  popAlpha(): void;
  /** pushes a translation onto the transform stack. */
  pushTranslate(x: number, y: number): void;
  /** pops the most recent translation. */
  popTranslate(): void;
  /** pushes a scale onto the transform stack. */
  pushScale(scaleX: number, scaleY: number): void;
  /** pops the most recent scale. */
  popScale(): void;

  /** releases cached resources held by the backend. */
  dispose(): void;
}
