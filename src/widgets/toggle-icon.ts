import { DEFAULTS } from "../defaults";

type ToggleState = "hamburger" | "x";

/** control points and opacity for one animated line segment. */
interface LineState {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
  opacity: number;
}

// three evenly spaced horizontal bars, each a straight run of four control points across the viewbox
const HAMBURGER: LineState[] = [
  { x1: 28, y1: 32, x2: 52, y2: 32, x3: 76, y3: 32, x4: 100, y4: 32, opacity: 1 },
  { x1: 28, y1: 64, x2: 52, y2: 64, x3: 76, y3: 64, x4: 100, y4: 64, opacity: 1 },
  { x1: 28, y1: 96, x2: 52, y2: 96, x3: 76, y3: 96, x4: 100, y4: 96, opacity: 1 }
];

// the two diagonal strokes of an x; the middle bar collapses to the center point and fades out
const CLOSE: LineState[] = [
  { x1: 34, y1: 34, x2: 54, y2: 54, x3: 74, y3: 74, x4: 94, y4: 94, opacity: 1 },
  { x1: 64, y1: 64, x2: 64, y2: 64, x3: 64, y3: 64, x4: 64, y4: 64, opacity: 0 },
  { x1: 94, y1: 34, x2: 74, y2: 54, x3: 54, y3: 74, x4: 34, y4: 94, opacity: 1 }
];

// ease-in-out cubic per Robert Penner "Programming Macromedia Flash MX" (2002)
function easeInOutCubic(t: number): number {
  // 4 = 2^(n-1) where n=3 for cubic, scales the first-half polynomial to reach 0.5 at t=0.5
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// linear interpolation from a to b by t
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// morph animation duration in milliseconds
const MORPH_DURATION = 320;
// coordinate space size that line control points are defined in
const VIEWBOX = 128;

/** animated hamburger/close icon rendered to a canvas element. */
export class ToggleIcon {
  /** the canvas DOM element containing the icon. */
  public readonly element: HTMLCanvasElement;
  /** callback invoked when the icon is clicked. */
  public onClick: (() => void) | null = null;

  private ctx: CanvasRenderingContext2D;
  private size: number;
  private state: ToggleState = "hamburger";
  private from: LineState[] = [
    { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0, opacity: 0 },
    { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0, opacity: 0 },
    { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0, opacity: 0 }
  ];
  private current: LineState[] = [
    { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0, opacity: 0 },
    { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0, opacity: 0 },
    { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0, x4: 0, y4: 0, opacity: 0 }
  ];
  private target: LineState[] = HAMBURGER;
  private animStart = 0;
  private animating = false;
  private hovered = false;
  private animFrame = 0;
  private dpr: number;
  private readonly _boundTick: () => void;

  /**
   * builds and positions the fixed canvas element, seeds the line state to the hamburger shape, and wires
   * the click and hover listeners.
   */
  constructor(size: number, position: "left" | "right", margin: number, tabBarHeight: number) {
    this.size = size;
    this.dpr = window.devicePixelRatio || 1;
    this._boundTick = () => {
      this.animFrame = 0;
      this.tick();
    };
    for (let i = 0; i < 3; i++) {
      this.copyLine(HAMBURGER[i], this.from[i]);
      this.copyLine(HAMBURGER[i], this.current[i]);
    }

    const top = margin + (tabBarHeight - size) / 2;
    const side = margin + 8;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(size * this.dpr);
    canvas.height = Math.round(size * this.dpr);
    canvas.style.position = "fixed";
    canvas.style.top = `${top}px`;
    canvas.style[position] = `${side}px`;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.style.cursor = "pointer";
    canvas.style.zIndex = "1000000";

    canvas.addEventListener("click", () => {
      if (this.onClick) {
        this.onClick();
      }
    });
    canvas.addEventListener("mouseenter", () => {
      this.hovered = true;
      this.draw();
    });
    canvas.addEventListener("mouseleave", () => {
      this.hovered = false;
      this.draw();
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.ctx = canvas.getContext("2d")!;
    this.element = canvas;
    this.draw();
  }

  /** copies all four control points and the opacity from one line state into another. */
  private copyLine(src: LineState, dst: LineState): void {
    dst.x1 = src.x1;
    dst.y1 = src.y1;
    dst.x2 = src.x2;
    dst.y2 = src.y2;
    dst.x3 = src.x3;
    dst.y3 = src.y3;
    dst.x4 = src.x4;
    dst.y4 = src.y4;
    dst.opacity = src.opacity;
  }

  /** transitions to the given state with an animated morph. */
  public setState(newState: ToggleState): void {
    if (newState === this.state && !this.animating) {
      return;
    }
    for (let i = 0; i < 3; i++) {
      this.copyLine(this.current[i], this.from[i]);
    }
    this.state = newState;
    this.target = newState === "x" ? CLOSE : HAMBURGER;
    this.animStart = performance.now();
    this.animating = true;
    this.scheduleFrame();
  }

  /** requests a single animation frame, coalescing repeated calls made within the same frame. */
  private scheduleFrame(): void {
    if (this.animFrame) {
      return;
    }
    this.animFrame = requestAnimationFrame(this._boundTick);
  }

  /** advances the morph one frame, interpolating each line from its start toward the target, then redraws. */
  private tick(): void {
    if (!this.animating) {
      return;
    }
    const elapsed = performance.now() - this.animStart;
    const raw = Math.min(1, elapsed / MORPH_DURATION);
    const t = easeInOutCubic(raw);

    for (let i = 0; i < 3; i++) {
      const src = this.from[i];
      const dst = this.target[i];
      this.current[i].x1 = lerp(src.x1, dst.x1, t);
      this.current[i].y1 = lerp(src.y1, dst.y1, t);
      this.current[i].x2 = lerp(src.x2, dst.x2, t);
      this.current[i].y2 = lerp(src.y2, dst.y2, t);
      this.current[i].x3 = lerp(src.x3, dst.x3, t);
      this.current[i].y3 = lerp(src.y3, dst.y3, t);
      this.current[i].x4 = lerp(src.x4, dst.x4, t);
      this.current[i].y4 = lerp(src.y4, dst.y4, t);
      this.current[i].opacity = lerp(src.opacity, dst.opacity, t);
    }

    this.draw();

    if (raw >= 1) {
      this.animating = false;
    } else {
      this.scheduleFrame();
    }
  }

  /** clears the canvas and strokes each visible line, scaling from viewbox space to device pixels. */
  private draw(): void {
    const ctx = this.ctx;
    const scale = (this.size / VIEWBOX) * this.dpr;
    const strokeWidth = Math.max(2, (10 / VIEWBOX) * this.size * this.dpr);

    ctx.clearRect(0, 0, this.element.width, this.element.height);
    ctx.strokeStyle = this.hovered ? DEFAULTS.toggleIconHoveredStroke : DEFAULTS.toggleIconNormalStroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < 3; i++) {
      const line = this.current[i];
      if (line.opacity < 0.01) {
        continue;
      }

      ctx.globalAlpha = line.opacity;
      ctx.beginPath();
      ctx.moveTo(line.x1 * scale, line.y1 * scale);
      ctx.lineTo(line.x2 * scale, line.y2 * scale);
      ctx.lineTo(line.x3 * scale, line.y3 * scale);
      ctx.lineTo(line.x4 * scale, line.y4 * scale);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /** cancels any running animation and removes the canvas element from the DOM. */
  public destroy(): void {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
    this.element.remove();
  }
}
