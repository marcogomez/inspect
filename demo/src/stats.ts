import { monitor, select, separator, toggle } from "@mgz-dev/inspect";

import type { ControlConfig } from "@mgz-dev/inspect";

/**
 * frame-timing and renderer statistics for the demo's performance tab. tracks
 * instantaneous and EMA-smoothed fps, frame and delta times, dt and wall-clock
 * jitter, and three.js draw counters, exposed as Inspect monitor controls.
 */
export class AmbientStats {
  fps = 0;
  fpsAvg = 0;
  frameTime = 0;
  deltaTime = 0;
  dtJitter = 0;
  dtJitterPct = 0;
  wallJitter = 0;
  wallJitterPct = 0;
  triangles = 0;
  drawCalls = 0;
  geometries = 0;
  textures = 0;

  frameTimeSmooth = 0;
  deltaTimeSmooth = 0;
  dtJitterSmooth = 0;
  dtJitterPctSmooth = 0;
  wallJitterSmooth = 0;
  wallJitterPctSmooth = 0;

  private fpsEma = 0;
  private fpsEmaAlpha = 0.01;
  private dtEma = 0;
  private dtSqEma = 0;
  private dtJitterAlpha = 0.02;
  private dtJitterAlphaMin = 0.005;
  private dtJitterAlphaMax = 0.1;
  private dtJitterStabilizationThreshold = 10;

  private wallLastTime = 0;
  private wallDtEma = 0;
  private wallDtSqEma = 0;
  private wallJitterAlpha = 0.02;

  private smoothEMA = 0.01;

  /**
   * build the monitor, select, and toggle controls for the performance tab.
   * @param fpsState - shared frame-rate-cap state; the select and toggle mutate it in place
   * @returns the control configs to register in a folder
   */
  controls(fpsState: { fpsTarget: number; limitFps: boolean }): ControlConfig[] {
    const int = (v: number) => String(Math.round(v));
    const ms = (v: number) => v.toFixed(1) + " ms";
    const pct = (v: number) => v.toFixed(1) + " %";

    return [
      monitor({ key: "fps", label: "FPS", value: () => this.fps, format: (v) => v.toFixed(1) }),
      monitor({ key: "fpsAvg", label: "FPS (avg)", value: () => this.fpsAvg, format: int }),
      monitor({ key: "fpsGraph", label: "FPS", value: () => this.fps, view: "graph", min: 0, max: 144 }),
      select({
        key: "fpsTarget",
        label: "FPS target",
        options: { "30": 30, "40": 40, "60": 60, "72": 72, "90": 90, "120": 120 },
        value: () => fpsState.fpsTarget,
        onChange: (v) => {
          fpsState.fpsTarget = v as number;
        }
      }),
      toggle({
        key: "limitFps",
        label: "limit to FPS target",
        value: () => fpsState.limitFps,
        onChange: (v) => {
          fpsState.limitFps = v;
        }
      }),
      separator("sep-timing"),
      monitor({ key: "frameTime", label: "frame (ms)", value: () => this.frameTime, format: ms }),
      monitor({ key: "deltaTime", label: "dt (ms)", value: () => this.deltaTime, format: ms }),
      monitor({ key: "dtJitter", label: "dt jitter", value: () => this.dtJitter, format: ms }),
      monitor({ key: "dtJitterPct", label: "dt jitter %", value: () => this.dtJitterPct, format: pct }),
      monitor({ key: "wallJitter", label: "wall jitter", value: () => this.wallJitter, format: ms }),
      monitor({ key: "wallJitterPct", label: "wall jitter %", value: () => this.wallJitterPct, format: pct }),
      separator("sep-smooth"),
      monitor({ key: "frameTimeSmooth", label: "frame (avg)", value: () => this.frameTimeSmooth, format: ms }),
      monitor({ key: "deltaTimeSmooth", label: "dt (avg)", value: () => this.deltaTimeSmooth, format: ms }),
      monitor({ key: "dtJitterSmooth", label: "dt jitter (avg)", value: () => this.dtJitterSmooth, format: ms }),
      monitor({
        key: "dtJitterPctSmooth",
        label: "dt jitter % (avg)",
        value: () => this.dtJitterPctSmooth,
        format: pct
      }),
      monitor({
        key: "wallJitterSmooth",
        label: "wall jitter (avg)",
        value: () => this.wallJitterSmooth,
        format: ms
      }),
      monitor({
        key: "wallJitterPctSmooth",
        label: "wall jitter % (avg)",
        value: () => this.wallJitterPctSmooth,
        format: pct
      }),
      separator("sep-renderer"),
      monitor({ key: "triangles", value: () => this.triangles, format: int }),
      monitor({ key: "drawCalls", label: "draw calls", value: () => this.drawCalls, format: int }),
      monitor({ key: "geometries", value: () => this.geometries, format: int }),
      monitor({ key: "textures", value: () => this.textures, format: int })
    ];
  }

  /**
   * fold one frame into the stat fields: instantaneous and EMA fps, dt and
   * wall-clock jitter (standard deviation from an EMA of the value and its
   * square), the renderer draw counters, and the smoothed display values.
   * @param rendererInfo - three.js render and memory counters for this frame
   * @param frameRenderTimeMs - milliseconds spent rendering this frame
   * @param dtSeconds - seconds elapsed since the previous frame
   */
  update(
    rendererInfo: {
      render: { triangles: number; drawCalls: number };
      memory: { geometries: number; textures: number };
    },
    frameRenderTimeMs: number,
    dtSeconds: number
  ): void {
    const dtMs = dtSeconds * 1000;

    this.triangles = rendererInfo.render.triangles;
    this.drawCalls = rendererInfo.render.drawCalls;
    this.geometries = rendererInfo.memory.geometries;
    this.textures = rendererInfo.memory.textures;
    this.frameTime = frameRenderTimeMs;
    this.deltaTime = dtMs;

    const fps = dtSeconds > 0 ? 1 / dtSeconds : 0;
    if (this.fpsEma === 0) {
      this.fpsEma = fps;
    } else {
      this.fpsEma = this.fpsEmaAlpha * fps + (1 - this.fpsEmaAlpha) * this.fpsEma;
    }
    this.fps = fps;
    this.fpsAvg = Math.round(this.fpsEma);

    if (this.dtEma === 0) {
      this.dtEma = dtMs;
      this.dtSqEma = dtMs * dtMs;
    } else {
      this.dtEma = this.dtJitterAlpha * dtMs + (1 - this.dtJitterAlpha) * this.dtEma;
      this.dtSqEma = this.dtJitterAlpha * (dtMs * dtMs) + (1 - this.dtJitterAlpha) * this.dtSqEma;
    }
    const variance = Math.max(0, this.dtSqEma - this.dtEma * this.dtEma);
    this.dtJitter = Math.sqrt(variance);
    const cv = this.dtEma > 0 ? (this.dtJitter / this.dtEma) * 100 : 0;
    this.dtJitterAlpha = cv > this.dtJitterStabilizationThreshold ? this.dtJitterAlphaMax : this.dtJitterAlphaMin;
    this.dtJitterPct = cv;

    const wallNow = performance.now();
    const wallDtMs = this.wallLastTime > 0 ? wallNow - this.wallLastTime : dtMs;
    this.wallLastTime = wallNow;
    if (this.wallDtEma === 0) {
      this.wallDtEma = wallDtMs;
      this.wallDtSqEma = wallDtMs * wallDtMs;
    } else {
      this.wallDtEma = this.wallJitterAlpha * wallDtMs + (1 - this.wallJitterAlpha) * this.wallDtEma;
      this.wallDtSqEma = this.wallJitterAlpha * (wallDtMs * wallDtMs) + (1 - this.wallJitterAlpha) * this.wallDtSqEma;
    }
    const wallVariance = Math.max(0, this.wallDtSqEma - this.wallDtEma * this.wallDtEma);
    this.wallJitter = Math.sqrt(wallVariance);
    this.wallJitterPct = this.wallDtEma > 0 ? (this.wallJitter / this.wallDtEma) * 100 : 0;

    const a = this.smoothEMA;
    const b = 1 - a;
    this.frameTimeSmooth =
      this.frameTimeSmooth === 0 ? frameRenderTimeMs : a * frameRenderTimeMs + b * this.frameTimeSmooth;
    this.deltaTimeSmooth = this.deltaTimeSmooth === 0 ? dtMs : a * dtMs + b * this.deltaTimeSmooth;
    this.dtJitterSmooth = this.dtJitterSmooth === 0 ? this.dtJitter : a * this.dtJitter + b * this.dtJitterSmooth;
    this.dtJitterPctSmooth =
      this.dtJitterPctSmooth === 0 ? this.dtJitterPct : a * this.dtJitterPct + b * this.dtJitterPctSmooth;
    this.wallJitterSmooth =
      this.wallJitterSmooth === 0 ? this.wallJitter : a * this.wallJitter + b * this.wallJitterSmooth;
    this.wallJitterPctSmooth =
      this.wallJitterPctSmooth === 0 ? this.wallJitterPct : a * this.wallJitterPct + b * this.wallJitterPctSmooth;
  }
}
