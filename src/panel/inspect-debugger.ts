import type { FlushInfo, Surface } from "../core/surface";

const OVERLAY_HEIGHT = 18; // debug overlay bar height in px
const BORDER_FADE_MS = 60; // dirty-rect border fade duration in ms
const LABEL_FADE_MS = 5000; // status label fade duration in ms
const MAX_LOG_ENTRIES = 2000;

/**
 * Debug overlay that visualizes dirty rects and flush timing on top of the panel canvas.
 * Renders red stroke outlines around partial repaints and a status bar showing timing.
 */
export class InspectDebugger {
  private surface: Surface;
  private overlay: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;
  private borderClearTimer = 0;
  private labelClearTimer = 0;
  private readonly _boundClearBorder: () => void;
  private readonly _boundClearLabel: () => void;
  private logEntries: string[] = new Array<string>(MAX_LOG_ENTRIES).fill("");
  private _logHead = 0;
  private _logCount = 0;
  private _firstPaint = true;

  /** creates an overlay canvas mirroring the panel's position and size and hooks the surface's after-flush callback. */
  constructor(surface: Surface, panelCanvas: HTMLCanvasElement) {
    this.surface = surface;

    this.overlay = document.createElement("canvas");
    this.overlay.style.position = "fixed";
    this.overlay.style.top = panelCanvas.style.top;
    this.overlay.style.width = panelCanvas.style.width;
    this.overlay.style.height = panelCanvas.style.height;
    this.overlay.style.pointerEvents = "none";
    this.overlay.style.zIndex = "10000000";
    if (panelCanvas.style.right) {
      this.overlay.style.right = panelCanvas.style.right;
    } else {
      this.overlay.style.left = panelCanvas.style.left;
    }
    if (panelCanvas.style.borderRadius) {
      this.overlay.style.borderRadius = panelCanvas.style.borderRadius;
    }
    panelCanvas.parentElement?.appendChild(this.overlay);

    const ctx = this.overlay.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create debug overlay context");
    }
    this.overlayCtx = ctx;

    this._boundClearBorder = () => {
      this.borderClearTimer = 0;
      const c = this.overlayCtx;
      c.clearRect(0, 0, this.overlay.width, this.overlay.height - OVERLAY_HEIGHT);
    };
    this._boundClearLabel = () => {
      this.labelClearTimer = 0;
      const c = this.overlayCtx;
      const labelY = this.overlay.height - OVERLAY_HEIGHT;
      c.clearRect(0, labelY, this.overlay.width, OVERLAY_HEIGHT);
    };

    surface.onAfterFlush = (info) => this.onFlush(info);
  }

  /** builds the one-line flush status: wall-clock timestamp, repaint kind, flush time, and repainted area percent. */
  private formatEntry(info: FlushInfo): string {
    const t = (performance.now() / 1000) | 0;
    const s = t % 60;
    const m = ((t / 60) | 0) % 60;
    const h = ((t / 3600) | 0) % 24;
    const ts = `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    if (info.isFullRepaint) {
      if (this._firstPaint) {
        this._firstPaint = false;
        return `[${ts}] FIRST PAINT (FULL) ${info.flushTimeMs.toFixed(2)}ms 100%`;
      }
      return `[${ts}] FULL ${info.flushTimeMs.toFixed(2)}ms 100%`;
    }
    let totalArea = 0;
    for (let i = 0; i < info.dirtyRectCount; i++) {
      const rect = info.dirtyRects[i];
      totalArea += rect.width * rect.height;
    }
    const pct = ((totalArea / (info.canvasWidth * info.canvasHeight)) * 100).toFixed(1);
    return `[${ts}] ${info.dirtyRectCount}r ${info.flushTimeMs.toFixed(2)}ms ${pct}%`;
  }

  /**
   * Runs after each surface flush: logs the entry into the ring buffer, strokes
   * red outlines around partial dirty rects, and draws the status bar. Timers
   * then fade the outlines and the label after their respective delays.
   */
  private onFlush(info: FlushInfo): void {
    if (this.overlay.width !== info.canvasWidth || this.overlay.height !== info.canvasHeight) {
      this.overlay.width = info.canvasWidth;
      this.overlay.height = info.canvasHeight;
    }

    const isFirstPaint = this._firstPaint;
    const entry = this.formatEntry(info);
    this.logEntries[this._logHead] = entry;
    this._logHead = (this._logHead + 1) % MAX_LOG_ENTRIES;
    if (this._logCount < MAX_LOG_ENTRIES) {
      this._logCount++;
    }

    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, info.canvasWidth, info.canvasHeight);

    if (!info.isFullRepaint) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
      ctx.lineWidth = 2;
      for (let i = 0; i < info.dirtyRectCount; i++) {
        const rect = info.dirtyRects[i];
        ctx.strokeRect((rect.x | 0) + 1, (rect.y | 0) + 1, (rect.width | 0) - 2, (rect.height | 0) - 2);
      }
    }

    const overlayY = info.canvasHeight - OVERLAY_HEIGHT;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, overlayY, info.canvasWidth, OVERLAY_HEIGHT);
    ctx.fillStyle = isFirstPaint ? "#ffffff" : info.isFullRepaint ? "#ff4444" : "#44ff44";
    ctx.font = "11px monospace";
    ctx.fillText(entry, 8, overlayY + 13);

    if (this.borderClearTimer) {
      clearTimeout(this.borderClearTimer);
    }
    this.borderClearTimer = window.setTimeout(this._boundClearBorder, BORDER_FADE_MS);

    if (this.labelClearTimer) {
      clearTimeout(this.labelClearTimer);
    }
    this.labelClearTimer = window.setTimeout(this._boundClearLabel, LABEL_FADE_MS);
  }

  /** clears pending timers and removes the overlay canvas. */
  public dispose(): void {
    this.surface.onAfterFlush = null;
    if (this.borderClearTimer) {
      clearTimeout(this.borderClearTimer);
    }
    if (this.labelClearTimer) {
      clearTimeout(this.labelClearTimer);
    }
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
