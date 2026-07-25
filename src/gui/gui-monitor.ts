import { LabeledControl } from "./labeled-control";
import { StackLayout } from "../core/layouts/stack-layout";
import { DEFAULTS } from "../defaults";
import { Box } from "../widgets/box";
import { CanvasWidget } from "../widgets/canvas-widget";
import { Label } from "../widgets/label";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";
import type { InspectTheme } from "../themes/inspect-theme";

/** Configuration for a read-only monitor display (text or graph). */
export interface GuiMonitorConfig {
  key: string;
  label: string;
  value: () => string | number;
  format?: (value: number) => string;
  graph?: boolean;
  interval?: number;
  min?: number;
  max?: number;
}

/**
 * Read-only control displaying a live value as text or a scrolling line graph.
 * Uses a ring buffer to store recent samples for graph mode.
 */
export class GuiMonitor extends LabeledControl {
  private readonly _config: GuiMonitorConfig;
  private readonly _valueLabel: Label | null;
  private readonly _valueBg: Box | null;
  private readonly _graph: CanvasWidget | null;
  private readonly _ringBuffer: Float64Array;
  private _ringHead = 0;
  private _ringCount = 0;
  private _ringMin = Infinity;
  private _ringMax = -Infinity;
  private _lastRefreshTime = 0;
  private _lastRawValue: string | number = "";
  private _lastFormattedNum = NaN;
  private _lastFormattedStr = "";
  private _lastGraphValue = NaN;
  private _graphStableCount = 0;

  /** builds either a graph canvas or a right-aligned value label, depending on config.graph. */
  constructor(config: GuiMonitorConfig) {
    super();
    this._config = config;
    this.labelText = config.label;
    this._ringBuffer = new Float64Array(DEFAULTS.monitorRingSize);

    if (config.graph) {
      this._valueLabel = null;
      this._valueBg = null;
      this.sizingY = "fixed";
      this.preferredHeight = DEFAULTS.monitorGraphHeight;
      this._graph = new CanvasWidget();
      this._graph.sizingX = "grow";
      this._graph.sizingY = "grow";
      this._graph.flexGrow = 1;
      this._graph.onDraw = (renderer: Renderer, theme: Theme, width: number, height: number) => {
        this.drawGraph(renderer, theme, width, height);
      };
      this.controlContainer.addChild(this._graph);
    } else {
      this._graph = null;

      this._valueBg = new Box();
      const valueBg = this._valueBg;
      valueBg.sizingX = "grow";
      valueBg.sizingY = "grow";
      valueBg.flexGrow = 1;
      valueBg.borderRadius = 2;
      valueBg.layout = new StackLayout("horizontal", 0, "end", "stretch");
      valueBg.setPadding(0, 4, 0, 4);

      this._valueLabel = new Label();
      this._valueLabel.sizingX = "grow";
      this._valueLabel.sizingY = "grow";
      this._valueLabel.flexGrow = 1;
      this._valueLabel.hAlign = "right";
      this._valueLabel.vAlign = "middle";
      this._valueLabel.overflow = "ellipsis";
      valueBg.addChild(this._valueLabel);
      this.controlContainer.addChild(valueBg);
    }
  }

  /** the config this monitor was created with. */
  public get config(): GuiMonitorConfig {
    return this._config;
  }

  /** applies theme colors to the value label and background. */
  public override applyTheme(theme: Theme): void {
    super.applyTheme(theme);
    const t = theme as InspectTheme;
    if (this._graph) {
      this.preferredHeight = DEFAULTS.monitorGraphHeight;
    }
    if (this._valueLabel) {
      this._valueLabel.color = t.textValue;
    }
    if (this._valueBg) {
      this._valueBg.bgColor = theme.bgPanelInset;
    }
  }

  /** samples the current value and updates the text or graph, honoring the refresh interval. */
  public refresh(): void {
    const interval = this._config.interval ?? 0;
    if (interval > 0) {
      const now = Date.now();
      if (now - this._lastRefreshTime < interval) {
        return;
      }
      this._lastRefreshTime = now;
    }

    const current = this._config.value();

    if (this._graph) {
      const numValue = typeof current === "number" ? current : parseFloat(current) || 0;
      if (numValue !== this._lastGraphValue) {
        this._lastGraphValue = numValue;
        this._graphStableCount = 0;
        this.pushRingValue(numValue);
        this._graph.markDirty();
      } else if (this._graphStableCount < DEFAULTS.monitorRingSize) {
        this._graphStableCount++;
        this.pushRingValue(numValue);
        this._graph.markDirty();
      }
    } else if (this._valueLabel) {
      if (current === this._lastRawValue) {
        return;
      }
      this._lastRawValue = current;
      const formatted = this.formatValue(current);
      if (this._valueLabel.text === formatted) {
        return;
      }
      this._valueLabel.text = formatted;
      this._valueLabel.markDirty();
    }
  }

  /**
   * Appends a sample to the ring buffer, advancing the head and tracking the
   * running min and max. The min and max update incrementally, but when the
   * evicted sample was the current min or max the extent is rescanned since its
   * true value can no longer be known.
   */
  private pushRingValue(value: number): void {
    const evicted = this._ringCount >= DEFAULTS.monitorRingSize ? this._ringBuffer[this._ringHead] : undefined;
    this._ringBuffer[this._ringHead] = value;
    this._ringHead = (this._ringHead + 1) % DEFAULTS.monitorRingSize;
    if (this._ringCount < DEFAULTS.monitorRingSize) {
      this._ringCount++;
    }

    if (value < this._ringMin) {
      this._ringMin = value;
    }
    if (value > this._ringMax) {
      this._ringMax = value;
    }

    if (evicted !== undefined && (evicted === this._ringMin || evicted === this._ringMax)) {
      this._ringMin = Infinity;
      this._ringMax = -Infinity;
      for (let i = 0; i < this._ringCount; i++) {
        const v = this._ringBuffer[i];
        if (v < this._ringMin) {
          this._ringMin = v;
        }
        if (v > this._ringMax) {
          this._ringMax = v;
        }
      }
    }
  }

  /** draws the inset background and a polyline of the buffered samples, oldest to newest, scaled to the value range. */
  private drawGraph(renderer: Renderer, theme: Theme, width: number, height: number): void {
    const t = theme as InspectTheme;
    renderer.fillRoundedRect(0, 0, width, height, DEFAULTS.monitorGraphBorderRadius, theme.bgPanelInset);
    renderer.strokeRoundedRect(
      0,
      0,
      width,
      height,
      DEFAULTS.monitorGraphBorderRadius,
      theme.borderInset,
      DEFAULTS.monitorGraphStrokeWidth
    );

    if (this._ringCount < 2) {
      return;
    }

    const graphMin = this._config.min ?? this._ringMin;
    const graphMax = this._config.max ?? this._ringMax;
    const range = graphMax - graphMin;
    const safeRange = range > 0 ? range : 1;
    const lineColor = t.bgAccent || theme.textHighlight;
    const stepX = width / (DEFAULTS.monitorRingSize - 1);
    const oldest = this._ringCount < DEFAULTS.monitorRingSize ? 0 : this._ringHead;

    renderer.beginPath();
    for (let i = 0; i < this._ringCount; i++) {
      const idx = (oldest + i) % DEFAULTS.monitorRingSize;
      const normalized = (this._ringBuffer[idx] - graphMin) / safeRange;
      const px = (i * stepX) | 0;
      const py = (height - 1 - normalized * (height - 2)) | 0;
      if (i === 0) {
        renderer.moveTo(px, py);
      } else {
        renderer.lineTo(px, py);
      }
    }
    renderer.strokePath(lineColor, DEFAULTS.monitorGraphStrokeWidth);
  }

  /** formats a number (config formatter, integer, or two decimals), caching the last; strings pass through. */
  private formatValue(value: string | number): string {
    if (typeof value === "string") {
      return value;
    }
    if (value === this._lastFormattedNum) {
      return this._lastFormattedStr;
    }
    this._lastFormattedNum = value;
    if (this._config.format) {
      this._lastFormattedStr = this._config.format(value);
    } else if (Number.isInteger(value)) {
      this._lastFormattedStr = String(value);
    } else {
      this._lastFormattedStr = value.toFixed(2);
    }
    return this._lastFormattedStr;
  }
}
