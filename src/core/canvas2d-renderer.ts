import type { FontAtlas, TextureAtlas } from "./atlas";
import type { Renderer } from "./renderer";

const ALPHA_STACK_CAPACITY = 32;
const TWO_PI = Math.PI * 2;

/** Pre-computed hex strings for bytes 0x00-0xff to avoid per-frame allocations. */
const HEX_BYTE_LOOKUP: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

/** Canvas 2D implementation of the Renderer interface. */
export class Canvas2DRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D;
  private alphaStack = new Float64Array(ALPHA_STACK_CAPACITY);
  private alphaStackIndex = 0;
  private currentAlpha = 1;
  private colorCache = new Map<number, string>();
  private partialFrame = false;
  private _lastCSSColor = -1;
  private _lastCSSResult = "";
  private _lastTintColor = -1;
  private _lastTintResult: HTMLCanvasElement | HTMLImageElement | null = null;

  /** acquires the canvas 2D context, throwing when the browser cannot provide one. */
  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }
    this.ctx = ctx;
  }

  /** clears the whole canvas and resets alpha state for a full-frame pass. */
  public begin(width: number, height: number): void {
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.imageSmoothingEnabled = false;
    this.alphaStackIndex = 0;
    this.currentAlpha = 1;
    this.ctx.globalAlpha = 1;
    this.partialFrame = false;
  }

  /** clears and clips to the given rect for a partial pass, saving ctx state to restore in end(). */
  public beginPartial(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    ctx.clearRect(x | 0, y | 0, width | 0, height | 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x | 0, y | 0, width | 0, height | 0);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    this.alphaStackIndex = 0;
    this.currentAlpha = 1;
    ctx.globalAlpha = 1;
    this.partialFrame = true;
  }

  /** restores the clip and state saved by beginPartial; a no-op after a full begin(). */
  public end(): void {
    if (this.partialFrame) {
      this.ctx.restore();
      this.partialFrame = false;
    }
  }

  /** fills a pixel-snapped rectangle. */
  public fillRect(x: number, y: number, width: number, height: number, color: number): void {
    this.ctx.fillStyle = this.colorToCSS(color);
    this.ctx.fillRect(x | 0, y | 0, width | 0, height | 0);
  }

  /** strokes a rectangle outline, offset half a pixel so a 1px line stays crisp. */
  public strokeRect(x: number, y: number, width: number, height: number, color: number, lineWidth: number): void {
    this.ctx.strokeStyle = this.colorToCSS(color);
    this.ctx.lineWidth = lineWidth;
    // 0.5 offset aligns stroke center to pixel grid for crisp 1px lines
    this.ctx.strokeRect((x | 0) + 0.5, (y | 0) + 0.5, (width | 0) - 1, (height | 0) - 1);
  }

  /** fills a rounded rectangle, clamping the radius to at most half the smaller side. */
  public fillRoundedRect(x: number, y: number, width: number, height: number, radius: number, color: number): void {
    const ctx = this.ctx;
    const roundedX = x | 0;
    const roundedY = y | 0;
    const roundedWidth = width | 0;
    const roundedHeight = height | 0;
    if (roundedWidth <= 0 || roundedHeight <= 0) {
      return;
    }
    const clampedRadius = Math.max(0, Math.min(radius, roundedWidth / 2, roundedHeight / 2));
    ctx.fillStyle = this.colorToCSS(color);
    ctx.beginPath();
    ctx.roundRect(roundedX, roundedY, roundedWidth, roundedHeight, clampedRadius);
    ctx.fill();
  }

  /** strokes a rounded-rectangle outline, offset half a pixel for a crisp 1px line. */
  public strokeRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: number,
    lineWidth: number
  ): void {
    const ctx = this.ctx;
    // 0.5 offset aligns the stroke center to the pixel grid for crisp 1px lines
    const roundedX = (x | 0) + 0.5;
    const roundedY = (y | 0) + 0.5;
    const roundedWidth = (width | 0) - 1;
    const roundedHeight = (height | 0) - 1;
    if (roundedWidth <= 0 || roundedHeight <= 0) {
      return;
    }
    const clampedRadius = Math.max(0, Math.min(radius, roundedWidth / 2, roundedHeight / 2));
    ctx.strokeStyle = this.colorToCSS(color);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.roundRect(roundedX, roundedY, roundedWidth, roundedHeight, clampedRadius);
    ctx.stroke();
  }

  /** blits a source sub-region of the atlas image into the destination rect. */
  public drawImage(
    atlas: TextureAtlas,
    srcX: number,
    srcY: number,
    srcWidth: number,
    srcHeight: number,
    dstX: number,
    dstY: number,
    dstWidth: number,
    dstHeight: number
  ): void {
    this.ctx.drawImage(atlas.image, srcX, srcY, srcWidth, srcHeight, dstX | 0, dstY | 0, dstWidth | 0, dstHeight | 0);
  }

  /**
   * Draws text one glyph at a time from the atlas, recolored to the given
   * color via a cached tinted copy of the atlas. Glyphs inside the contiguous
   * range use the flat char table; others fall back to getCharRegion.
   */
  public drawText(
    atlas: FontAtlas,
    text: string,
    x: number,
    y: number,
    color: number,
    scale?: number,
    letterSpacing?: number
  ): void {
    const charWidth = atlas.charWidth;
    const lineHeight = atlas.lineHeight;

    const table = atlas.charTable;

    const firstChar = atlas.firstChar;
    const lastChar = atlas.lastChar;

    const ctx = this.ctx;

    const tintedAtlas = this.getTintedAtlas(atlas, color);
    const scaleFactor = scale ?? 1;

    const destCharWidth = (charWidth * scaleFactor) | 0;
    const destCharHeight = (lineHeight * scaleFactor) | 0;
    const advance = destCharWidth + (letterSpacing ?? 0);

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= firstChar && code <= lastChar) {
        const tableIndex = (code - firstChar) * 4;
        ctx.drawImage(
          tintedAtlas,
          table[tableIndex],
          table[tableIndex + 1],
          table[tableIndex + 2],
          table[tableIndex + 3],
          (x + i * advance) | 0,
          y | 0,
          destCharWidth,
          destCharHeight
        );
      } else {
        const region = atlas.getCharRegion(code);
        if (region) {
          ctx.drawImage(
            tintedAtlas,
            region.x,
            region.y,
            region.width,
            region.height,
            (x + i * advance) | 0,
            y | 0,
            destCharWidth,
            destCharHeight
          );
        }
      }
    }
  }

  private tintedAtlasCache = new Map<number, HTMLCanvasElement>();

  /**
   * Returns a copy of the atlas recolored to the given color, building it once
   * per color via a source-in composite and caching the result. A one-entry
   * fast path and a 16-entry cache keep repeated text draws off the composite
   * path; the cache is flushed once it grows past that bound.
   */
  private getTintedAtlas(atlas: FontAtlas, color: number): HTMLCanvasElement | HTMLImageElement {
    const packed = color >>> 0;
    if (packed === this._lastTintColor && this._lastTintResult) {
      return this._lastTintResult;
    }
    let cached = this.tintedAtlasCache.get(packed);
    if (cached) {
      this._lastTintColor = packed;
      this._lastTintResult = cached;
      return cached;
    }

    const sourceImage = atlas.image;
    cached = document.createElement("canvas");
    cached.width = sourceImage.width;
    cached.height = sourceImage.height;
    const tintContext = cached.getContext("2d");
    if (!tintContext) {
      return sourceImage;
    }
    tintContext.imageSmoothingEnabled = false;
    tintContext.drawImage(sourceImage, 0, 0);
    tintContext.globalCompositeOperation = "source-in";
    tintContext.fillStyle = this.colorToCSS(color);
    tintContext.fillRect(0, 0, cached.width, cached.height);

    if (this.tintedAtlasCache.size > 16) {
      this.tintedAtlasCache.clear();
    }
    this.tintedAtlasCache.set(packed, cached);
    this._lastTintColor = packed;
    this._lastTintResult = cached;
    return cached;
  }

  /** strokes a line, offset half a pixel so a 1px stroke stays crisp. */
  public drawLine(x1: number, y1: number, x2: number, y2: number, color: number, lineWidth: number): void {
    this.ctx.strokeStyle = this.colorToCSS(color);
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    // 0.5 offset aligns the stroke center to the pixel grid for crisp 1px lines
    this.ctx.moveTo(x1 + 0.5, y1 + 0.5);
    this.ctx.lineTo(x2 + 0.5, y2 + 0.5);
    this.ctx.stroke();
  }

  /** fills a full circle. */
  public fillCircle(cx: number, cy: number, radius: number, color: number): void {
    this.ctx.fillStyle = this.colorToCSS(color);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, TWO_PI);
    this.ctx.fill();
  }

  /** strokes a full circle outline. */
  public strokeCircle(cx: number, cy: number, radius: number, color: number, lineWidth: number): void {
    this.ctx.strokeStyle = this.colorToCSS(color);
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, TWO_PI);
    this.ctx.stroke();
  }

  /** strokes an arc, restoring the default butt cap afterward so it does not leak into later strokes. */
  public strokeArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: number,
    lineWidth: number,
    lineCap: "butt" | "round" | "square" = "butt"
  ): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.colorToCSS(color);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = lineCap;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  /** begins a new canvas path for the moveTo/lineTo/strokePath/fillPath primitives. */
  public beginPath(): void {
    this.ctx.beginPath();
  }

  /** starts a new subpath at the given point. */
  public moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  /** adds a line segment to the current path. */
  public lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  /** strokes the current path. */
  public strokePath(color: number, lineWidth: number): void {
    this.ctx.strokeStyle = this.colorToCSS(color);
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();
  }

  /** fills the current path. */
  public fillPath(color: number): void {
    this.ctx.fillStyle = this.colorToCSS(color);
    this.ctx.fill();
  }

  /** saves ctx state and clips to a pixel-snapped rect. */
  public pushClip(x: number, y: number, width: number, height: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x | 0, y | 0, width | 0, height | 0);
    this.ctx.clip();
  }

  /** restores the clip and reapplies the tracked alpha, since ctx.restore also reverts globalAlpha. */
  public popClip(): void {
    this.ctx.restore();
    this.ctx.globalAlpha = this.currentAlpha;
  }

  /** saves ctx state, translates, then clips to a rect expressed in the translated space. */
  public pushTranslateClip(tx: number, ty: number, cx: number, cy: number, cw: number, ch: number): void {
    this.ctx.save();
    this.ctx.translate(tx | 0, ty | 0);
    this.ctx.beginPath();
    this.ctx.rect(cx | 0, cy | 0, cw | 0, ch | 0);
    this.ctx.clip();
  }

  /** restores translate and clip, reapplying the tracked alpha that ctx.restore reverted. */
  public popTranslateClip(): void {
    this.ctx.restore();
    this.ctx.globalAlpha = this.currentAlpha;
  }

  /** pushes the current alpha and multiplies it by the given factor (a separate stack from ctx save/restore). */
  public pushAlpha(alpha: number): void {
    this.alphaStack[this.alphaStackIndex++] = this.currentAlpha;
    this.currentAlpha *= alpha;
    this.ctx.globalAlpha = this.currentAlpha;
  }

  /** pops back to the alpha saved by the matching pushAlpha. */
  public popAlpha(): void {
    this.currentAlpha = this.alphaStack[--this.alphaStackIndex];
    this.ctx.globalAlpha = this.currentAlpha;
  }

  /** saves ctx state and applies a pixel-snapped translation. */
  public pushTranslate(x: number, y: number): void {
    this.ctx.save();
    this.ctx.translate(x | 0, y | 0);
  }

  /** restores the translation, reapplying the tracked alpha that ctx.restore reverted. */
  public popTranslate(): void {
    this.ctx.restore();
    this.ctx.globalAlpha = this.currentAlpha;
  }

  /** saves ctx state and applies a scale. */
  public pushScale(scaleX: number, scaleY: number): void {
    this.ctx.save();
    this.ctx.scale(scaleX, scaleY);
  }

  /** restores the scale, reapplying the tracked alpha that ctx.restore reverted. */
  public popScale(): void {
    this.ctx.restore();
    this.ctx.globalAlpha = this.currentAlpha;
  }

  /** clears the color and tinted-atlas caches and their fast-path slots. */
  public dispose(): void {
    this.colorCache.clear();
    this.tintedAtlasCache.clear();
    this._lastCSSColor = -1;
    this._lastCSSResult = "";
    this._lastTintColor = -1;
    this._lastTintResult = null;
  }

  /**
   * Converts a packed RGBA color (0xRRGGBBAA) to a CSS hex string, dropping the
   * alpha byte when it is fully opaque. A single-slot fast path plus a 256-entry
   * cache keep the common repeated colors off the per-call string building; the
   * cache is flushed once it grows past that bound.
   */
  private colorToCSS(packedColor: number): string {
    packedColor >>>= 0;
    if (packedColor === this._lastCSSColor) {
      return this._lastCSSResult;
    }
    let css = this.colorCache.get(packedColor);
    if (css !== undefined) {
      this._lastCSSColor = packedColor;
      this._lastCSSResult = css;
      return css;
    }

    const red = (packedColor >>> 24) & 0xff;
    const green = (packedColor >>> 16) & 0xff;
    const blue = (packedColor >>> 8) & 0xff;
    const alpha = packedColor & 0xff;

    css =
      alpha === 0xff
        ? "#" + HEX_BYTE_LOOKUP[red] + HEX_BYTE_LOOKUP[green] + HEX_BYTE_LOOKUP[blue]
        : "#" + HEX_BYTE_LOOKUP[red] + HEX_BYTE_LOOKUP[green] + HEX_BYTE_LOOKUP[blue] + HEX_BYTE_LOOKUP[alpha];

    if (this.colorCache.size > 256) {
      this.colorCache.clear();
    }
    this.colorCache.set(packedColor, css);
    this._lastCSSColor = packedColor;
    this._lastCSSResult = css;
    return css;
  }
}
