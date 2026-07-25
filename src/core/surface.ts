import type { Renderer } from "./renderer";
import type { Theme } from "./theme";
import type { Widget } from "./widget";

/** Diagnostic information emitted after each frame flush. */
export interface FlushInfo {
  isFullRepaint: boolean;
  dirtyRects: ReadonlyArray<{ x: number; y: number; width: number; height: number }>;
  dirtyRectCount: number;
  canvasWidth: number;
  canvasHeight: number;
  flushTimeMs: number;
}

const MAX_DIRTY_RECTS = 32;

/** Mutable rectangle used for dirty-region tracking. */
interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** true when the two rects overlap or share an edge, using inclusive bounds so touching rects merge. */
function rectsOverlapOrTouch(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return !(ax > bx + bw || ax + aw < bx || ay > by + bh || ay + ah < by);
}

/** grows target in place to the bounding box of target and other. */
function mergeRectsInPlace(target: DirtyRect, other: DirtyRect): void {
  const minX = Math.min(target.x, other.x);
  const minY = Math.min(target.y, other.y);
  const maxX = Math.max(target.x + target.width, other.x + other.width);
  const maxY = Math.max(target.y + target.height, other.y + other.height);
  target.x = minX;
  target.y = minY;
  target.width = maxX - minX;
  target.height = maxY - minY;
}

/**
 * Manages a canvas element, dirty-rect tracking, resize observation, and
 * per-frame rendering of the widget tree via requestAnimationFrame.
 */
export class Surface {
  public readonly canvas: HTMLCanvasElement;
  public readonly renderer: Renderer;
  public onAfterFlush: ((info: FlushInfo) => void) | null = null;

  private root: Widget | null = null;
  private resizeObserver: ResizeObserver;
  private _width = 0;
  private _height = 0;
  private theme: Theme;
  private _frameId = 0;
  private animationFrameId = 0;
  private animationFrameScheduled = false;
  private readonly _boundFlush = () => {
    this.animationFrameScheduled = false;
    this.flush();
  };

  private dirtyRectsA: DirtyRect[] = [];
  private dirtyRectsB: DirtyRect[] = [];
  private dirtyRects: DirtyRect[] = this.dirtyRectsA;
  private dirtyRectCount = 0;
  private fullRepaint = true;

  private frameDirtyRects: DirtyRect[] = this.dirtyRectsB;
  private frameDirtyRectCount = 0;
  private frameIsFullRepaint = true;

  private dirtyRectPool: DirtyRect[] = Array.from({ length: MAX_DIRTY_RECTS }, () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  }));

  private scratchRect: DirtyRect = { x: 0, y: 0, width: 0, height: 0 };

  private _flushInfo: FlushInfo = {
    isFullRepaint: false,
    dirtyRects: [],
    dirtyRectCount: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    flushTimeMs: 0
  };

  /** wires up the canvas, renderer, and theme, and observes the canvas for size changes that force a full repaint. */
  constructor(canvas: HTMLCanvasElement, renderer: Renderer, theme: Theme) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.theme = theme;

    this.resizeObserver = new ResizeObserver((entries) => {
      const contentRect = entries[0].contentRect;
      this._width = contentRect.width | 0;
      this._height = contentRect.height | 0;
      this.fullRepaint = true;
      this.scheduleFrame();
    });
    this.resizeObserver.observe(this.canvas);
  }

  /** current canvas width in pixels, as reported by the resize observer. */
  public get width(): number {
    return this._width;
  }

  /** current canvas height in pixels, as reported by the resize observer. */
  public get height(): number {
    return this._height;
  }

  /** monotonically increasing counter, bumped once per completed flush. */
  public get frameId(): number {
    return this._frameId;
  }

  /** returns the active theme. */
  public getTheme(): Theme {
    return this.theme;
  }

  /** returns the root widget, or null if none is set. */
  public getRoot(): Widget | null {
    return this.root;
  }

  /** Returns true if the given rect overlaps any dirty region in the current frame. */
  public isRectInDirtyArea(x: number, y: number, width: number, height: number): boolean {
    if (this.frameIsFullRepaint) {
      return true;
    }
    for (let i = 0; i < this.frameDirtyRectCount; i++) {
      const rect = this.frameDirtyRects[i];
      if (!(x >= rect.x + rect.width || x + width <= rect.x || y >= rect.y + rect.height || y + height <= rect.y)) {
        return true;
      }
    }
    return false;
  }

  /** replaces the root widget, detaching the previous one, and schedules a full repaint. */
  public setRoot(widget: Widget): void {
    if (this.root) {
      this.root.setSurface(null);
    }
    this.root = widget;
    widget.setSurface(this);
    widget.needsLayout = true;
    this.fullRepaint = true;
    this.scheduleFrame();
  }

  /** swaps the active theme and schedules a full repaint. */
  public setTheme(theme: Theme): void {
    this.theme = theme;
    this.fullRepaint = true;
    this.scheduleFrame();
  }

  /** flags the whole surface for repaint on the next frame. */
  public markDirty(): void {
    this.fullRepaint = true;
    this.scheduleFrame();
  }

  /** Marks a rectangular region for partial repaint; merges with overlapping rects. */
  public markDirtyRect(x: number, y: number, width: number, height: number): void {
    if (this.fullRepaint) {
      this.scheduleFrame();
      return;
    }

    if (x + width <= 0 || y + height <= 0 || x >= this._width || y >= this._height) {
      return;
    }

    this.scratchRect.x = x;
    this.scratchRect.y = y;
    this.scratchRect.width = width;
    this.scratchRect.height = height;

    for (let i = 0; i < this.dirtyRectCount; i++) {
      const existing = this.dirtyRects[i];
      if (rectsOverlapOrTouch(x, y, width, height, existing.x, existing.y, existing.width, existing.height)) {
        mergeRectsInPlace(existing, this.scratchRect);
        this.mergeOverlapping(i);
        this.scheduleFrame();
        return;
      }
    }

    if (this.dirtyRectCount >= MAX_DIRTY_RECTS) {
      this.fullRepaint = true;
    } else {
      const pooled = this.dirtyRectPool[this.dirtyRectCount];
      pooled.x = x;
      pooled.y = y;
      pooled.width = width;
      pooled.height = height;
      this.dirtyRects[this.dirtyRectCount] = pooled;
      this.dirtyRectCount++;
    }

    this.scheduleFrame();
  }

  /**
   * After a rect at changedIndex grows, folds any other tracked rects it now
   * overlaps into it, repeating until no more merges apply. Removed entries are
   * filled from the end of the list, so the changed index is adjusted when the
   * moved entry sat before it.
   */
  private mergeOverlapping(changedIndex: number): void {
    let merged = true;
    while (merged) {
      merged = false;
      const target = this.dirtyRects[changedIndex];
      for (let i = this.dirtyRectCount - 1; i >= 0; i--) {
        if (i === changedIndex) {
          continue;
        }
        const other = this.dirtyRects[i];
        if (
          rectsOverlapOrTouch(
            target.x,
            target.y,
            target.width,
            target.height,
            other.x,
            other.y,
            other.width,
            other.height
          )
        ) {
          mergeRectsInPlace(target, other);
          this.dirtyRectCount--;
          if (i < this.dirtyRectCount) {
            this.dirtyRects[i] = this.dirtyRects[this.dirtyRectCount];
          }
          if (i < changedIndex) {
            changedIndex--;
          }
          merged = true;
        }
      }
    }
  }

  /** stops observation, cancels any pending frame, and disposes the renderer. */
  public dispose(): void {
    this.resizeObserver.disconnect();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    this.animationFrameScheduled = false;
    if (this.root) {
      this.root.setSurface(null);
    }
    this.renderer.dispose();
  }

  /** requests a single animation frame to run flush, coalescing repeated calls within a frame. */
  private scheduleFrame(): void {
    if (this.animationFrameScheduled) {
      return;
    }
    this.animationFrameScheduled = true;
    this.animationFrameId = requestAnimationFrame(this._boundFlush);
  }

  /** Performs layout and rendering for all accumulated dirty regions, then resets state. */
  public flush(): void {
    if (!this.fullRepaint && this.dirtyRectCount === 0) {
      return;
    }
    if (!this.root) {
      return;
    }
    const canvasWidth = this._width;
    const canvasHeight = this._height;
    if (canvasWidth === 0 || canvasHeight === 0) {
      this.scheduleFrame();
      return;
    }

    if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
      this.fullRepaint = true;
    }

    if (this.root.width !== canvasWidth || this.root.height !== canvasHeight) {
      this.root.width = canvasWidth;
      this.root.height = canvasHeight;
      this.root.needsLayout = true;
    }
    this.root.computeLayout();

    this.frameIsFullRepaint = this.fullRepaint;
    const swap = this.frameDirtyRects;
    this.frameDirtyRects = this.dirtyRects;
    this.frameDirtyRectCount = this.dirtyRectCount;
    this.dirtyRects = swap;
    this.dirtyRectCount = 0;
    this.fullRepaint = false;

    const t0 = this.onAfterFlush ? performance.now() : 0;

    if (this.frameIsFullRepaint) {
      this.renderer.begin(canvasWidth, canvasHeight);
      this.root.draw(this.renderer, this.theme);
      this.renderer.end();
    } else {
      for (let i = 0; i < this.frameDirtyRectCount; i++) {
        const rect = this.frameDirtyRects[i];
        const dx = Math.max(0, rect.x | 0);
        const dy = Math.max(0, rect.y | 0);
        const dw = Math.min(canvasWidth - dx, rect.width | 0);
        const dh = Math.min(canvasHeight - dy, rect.height | 0);
        if (dw > 0 && dh > 0) {
          this.renderer.beginPartial(dx, dy, dw, dh);
          this.root.draw(this.renderer, this.theme);
          this.renderer.end();
        }
      }
    }

    if (this.onAfterFlush) {
      this._flushInfo.isFullRepaint = this.frameIsFullRepaint;
      this._flushInfo.dirtyRects = this.frameDirtyRects;
      this._flushInfo.dirtyRectCount = this.frameDirtyRectCount;
      this._flushInfo.canvasWidth = canvasWidth;
      this._flushInfo.canvasHeight = canvasHeight;
      this._flushInfo.flushTimeMs = performance.now() - t0;
      this.onAfterFlush(this._flushInfo);
    }

    this._frameId++;
  }
}
