import { LabeledControl } from "./labeled-control";
import { StackLayout } from "../core/layouts/stack-layout";
import { THEME_DEFAULT } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { HEX_LUT, hsvToRgb, packRGBA, rgbToHsv } from "../utils/color-convert";
import { Box } from "../widgets/box";
import { CanvasWidget } from "../widgets/canvas-widget";
import { Label } from "../widgets/label";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";
import type { InspectTheme } from "../themes/inspect-theme";

/** How color channel values are stored (determines range and output shape). */
export type ColorMode = "float" | "int" | "hex" | "hexAlpha";
/** Format for the color value text displayed next to the swatch. */
export type ColorDisplayFormat = "hex" | "hexAlpha" | "floatRgb" | "floatRgba" | "intRgb" | "intRgba";

/** Configuration for a color picker control. */
export interface GuiColorConfig {
  key: string;
  label: string;
  value: () => { r: number; g: number; b: number; a?: number } | string;
  onChange: (color: { r: number; g: number; b: number; a?: number } | string) => void;
  mode?: ColorMode;
  alpha?: boolean;
  displayFormat?: ColorDisplayFormat;
}

const PICKER_WIDTH = DEFAULTS.colorSvSize + DEFAULTS.colorPickerPadding * 2;

// shared scratch objects reused across parse and emit to avoid per-call allocation on the color hot path.
const _scratchNorm = { r: 0, g: 0, b: 0, a: 1 };
const _scratchEmit = { r: 0, g: 0, b: 0, a: 1 };

/** parses a hex color into normalized 0..1 channels in _scratchNorm; a leading '#' is skipped, missing alpha is 1. */
function parseHexInto(hex: string): void {
  const c0 = hex.charCodeAt(0) === 35 ? 1 : 0;
  _scratchNorm.r = (hexByte(hex, c0) || 0) / 255;
  _scratchNorm.g = (hexByte(hex, c0 + 2) || 0) / 255;
  _scratchNorm.b = (hexByte(hex, c0 + 4) || 0) / 255;
  _scratchNorm.a = hex.length - c0 >= 8 ? (hexByte(hex, c0 + 6) || 0) / 255 : 1;
}

/** reads two hex digits at index i as a byte. */
function hexByte(s: string, i: number): number {
  return (hexNibble(s.charCodeAt(i)) << 4) | hexNibble(s.charCodeAt(i + 1));
}

/** maps a hex digit char code to its 0..15 value, returning 0 for anything else. */
function hexNibble(c: number): number {
  // '0'=48; 'A'=65 maps to 10 (subtract 55); 'a'=97 maps to 10 (subtract 87)
  if (c >= 48 && c <= 57) {
    return c - 48;
  }
  if (c >= 65 && c <= 70) {
    return c - 55;
  }
  if (c >= 97 && c <= 102) {
    return c - 87;
  }
  return 0;
}

/** formats normalized 0..1 channels as a hex string, appending the alpha byte only when a is given. */
function floatToHex(r: number, g: number, b: number, a?: number): string {
  // 0.5 bias before truncation implements round-half-up for float-to-byte conversion
  const ri = (Math.max(0, Math.min(1, r)) * 255 + 0.5) | 0;
  const gi = (Math.max(0, Math.min(1, g)) * 255 + 0.5) | 0;
  const bi = (Math.max(0, Math.min(1, b)) * 255 + 0.5) | 0;
  if (a !== undefined) {
    const ai = (Math.max(0, Math.min(1, a)) * 255 + 0.5) | 0;
    return "#" + HEX_LUT[ri] + HEX_LUT[gi] + HEX_LUT[bi] + HEX_LUT[ai];
  }
  return "#" + HEX_LUT[ri] + HEX_LUT[gi] + HEX_LUT[bi];
}

/** renders the color as the label string for the given display format (hex, or float/int r,g,b[,a] object text). */
function formatColorDisplay(r: number, g: number, b: number, a: number, fmt: ColorDisplayFormat): string {
  switch (fmt) {
    case "hex":
      return floatToHex(r, g, b);
    case "hexAlpha":
      return floatToHex(r, g, b, a);
    case "floatRgb":
      return "{r:" + r.toFixed(2) + ",g:" + g.toFixed(2) + ",b:" + b.toFixed(2) + "}";
    case "floatRgba":
      return "{r:" + r.toFixed(2) + ",g:" + g.toFixed(2) + ",b:" + b.toFixed(2) + ",a:" + a.toFixed(2) + "}";
    case "intRgb":
      return "{r:" + ((r * 255 + 0.5) | 0) + ",g:" + ((g * 255 + 0.5) | 0) + ",b:" + ((b * 255 + 0.5) | 0) + "}";
    case "intRgba":
      return (
        "{r:" +
        ((r * 255 + 0.5) | 0) +
        ",g:" +
        ((g * 255 + 0.5) | 0) +
        ",b:" +
        ((b * 255 + 0.5) | 0) +
        ",a:" +
        ((a * 255 + 0.5) | 0) +
        "}"
      );
  }
}

/** picks a default display format from the storage mode, choosing the alpha variant when alpha is enabled. */
function inferDisplayFormat(mode: ColorMode, hasAlpha: boolean): ColorDisplayFormat {
  switch (mode) {
    case "hex":
      return "hex";
    case "hexAlpha":
      return "hexAlpha";
    case "float":
      return hasAlpha ? "floatRgba" : "floatRgb";
    case "int":
      return hasAlpha ? "intRgba" : "intRgb";
  }
}

// module-wide cache of the hue bar swatch colors, built once and shared by every picker.
const _hueBarColors = new Uint32Array(DEFAULTS.colorHueSteps);
let _hueBarBuilt = false;

/** fills the shared hue bar color cache once, sampling full-saturation hues across the 0..360 range. */
function buildHueBarColors(): void {
  if (_hueBarBuilt) {
    return;
  }
  const steps = DEFAULTS.colorHueSteps;
  for (let i = 0; i < steps; i++) {
    const hue = ((i + 0.5) / steps) * 360;
    const c = hsvToRgb(hue, 1, 1);
    _hueBarColors[i] = packRGBA(c[0], c[1], c[2], 1);
  }
  _hueBarBuilt = true;
}

/**
 * Color picker control with swatch, value label, and popup HSV picker with
 * optional alpha channel support.
 */
export class GuiColor extends LabeledControl {
  private readonly _config: GuiColorConfig;
  private readonly _swatch: Box;
  private readonly _valueBg: Box;
  private readonly _valueLabel: Label;
  private readonly _mode: ColorMode;
  private readonly _hasAlpha: boolean;
  private readonly _displayFormat: ColorDisplayFormat;

  private _picker: Box | null = null;
  private _backdrop: Box | null = null;
  private _svWidget: CanvasWidget | null = null;
  private _hueWidget: CanvasWidget | null = null;
  private _alphaWidget: CanvasWidget | null = null;
  private _open = false;
  private _hue = 0;
  private _sat = 0;
  private _val = 1;
  private _alpha = 1;
  private _draggingSV = false;
  private _draggingHue = false;
  private _draggingAlpha = false;

  private _svCache: Uint32Array | null = null;
  private _svCacheHue = -1;
  private _alphaCache: Uint32Array | null = null;
  private _alphaCacheHue = -1;
  private _alphaCacheSat = -1;
  private _alphaCacheVal = -1;

  private _lastNormR = -1;
  private _lastNormG = -1;
  private _lastNormB = -1;

  /** resolves storage mode, alpha flag, and display format, then builds the swatch and value label; click-to-copy. */
  constructor(config: GuiColorConfig) {
    super();
    this._config = config;
    this.labelText = config.label;
    this._mode = config.mode ?? "float";
    this._hasAlpha = config.alpha ?? config.mode === "hexAlpha";
    this._displayFormat = config.displayFormat ?? inferDisplayFormat(this._mode, this._hasAlpha);

    this.controlContainer.layout = new StackLayout("horizontal", DEFAULTS.controlInnerGap, "start", "stretch");

    this._swatch = new Box();
    this._swatch.sizingX = "fixed";
    this._swatch.sizingY = "grow";
    this._swatch.preferredWidth = DEFAULTS.colorSwatchWidth;
    this._swatch.borderRadius = DEFAULTS.colorSwatchBorderRadius;
    this._swatch.borderColor = DEFAULTS.colorSwatchBorderColor;
    this._swatch.borderWidth = DEFAULTS.colorSwatchBorderWidth;
    this.controlContainer.addChild(this._swatch);

    this._valueBg = new Box();
    this._valueBg.sizingX = "grow";
    this._valueBg.sizingY = "grow";
    this._valueBg.flexGrow = 1;
    this._valueBg.borderRadius = 2;
    this._valueBg.layout = new StackLayout("horizontal", 0, "start", "stretch");
    this._valueBg.setPadding(0, 2, 0, 2);
    this._valueBg.onPointerDown = (_pid: number, _x: number, _y: number, _btn: number): boolean => {
      if (!this._open) {
        this.copyValueToClipboard();
      }
      return false;
    };

    this._valueLabel = new Label();
    this._valueLabel.sizingX = "grow";
    this._valueLabel.sizingY = "grow";
    this._valueLabel.flexGrow = 1;
    this._valueLabel.vAlign = "middle";
    this._valueLabel.hAlign = "left";
    this._valueLabel.overflow = "ellipsis";
    this._valueLabel.color = THEME_DEFAULT;
    this._valueBg.addChild(this._valueLabel);
    this.controlContainer.addChild(this._valueBg);

    this.syncFromValue();
  }

  /** copies the current value label text to the clipboard when available. */
  private copyValueToClipboard(): void {
    const text = this._valueLabel.text;
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  /** reads the bound value into normalized 0..1 channels in _scratchNorm, handling hex, int, and float forms. */
  private readNormalized(): void {
    const raw = this._config.value();
    if (typeof raw === "string") {
      parseHexInto(raw);
      return;
    }
    const scale = this._mode === "int" ? 1 / 255 : 1;
    _scratchNorm.r = raw.r * scale;
    _scratchNorm.g = raw.g * scale;
    _scratchNorm.b = raw.b * scale;
    _scratchNorm.a = raw.a !== undefined ? raw.a * scale : 1;
  }

  /** converts normalized channels back to the configured storage mode (int, hex, or float) and fires onChange. */
  private emitValue(r: number, g: number, b: number, a: number): void {
    const onChange = this._config.onChange as (v: unknown) => void;
    switch (this._mode) {
      case "int":
        _scratchEmit.r = Math.round(r * 255);
        _scratchEmit.g = Math.round(g * 255);
        _scratchEmit.b = Math.round(b * 255);
        if (this._hasAlpha) {
          _scratchEmit.a = Math.round(a * 255);
        }
        onChange(_scratchEmit);
        break;
      case "hex":
        onChange(floatToHex(r, g, b));
        break;
      case "hexAlpha":
        onChange(floatToHex(r, g, b, a));
        break;
      default:
        _scratchEmit.r = r;
        _scratchEmit.g = g;
        _scratchEmit.b = b;
        if (this._hasAlpha) {
          _scratchEmit.a = a;
        }
        onChange(_scratchEmit);
        break;
    }
  }

  /** reads the bound value and, when its RGB changed, refreshes the cached HSV, alpha, swatch, and value label. */
  private syncFromValue(): void {
    this.readNormalized();
    const nr = _scratchNorm.r;
    const ng = _scratchNorm.g;
    const nb = _scratchNorm.b;
    if (nr === this._lastNormR && ng === this._lastNormG && nb === this._lastNormB) {
      return;
    }
    this._lastNormR = nr;
    this._lastNormG = ng;
    this._lastNormB = nb;
    const hsv = rgbToHsv(nr, ng, nb);
    this._hue = hsv[0];
    this._sat = hsv[1];
    this._val = hsv[2];
    this._alpha = _scratchNorm.a;
    this._swatch.bgColor = packRGBA(nr, ng, nb, _scratchNorm.a);
    this._valueLabel.text = formatColorDisplay(nr, ng, nb, _scratchNorm.a, this._displayFormat);
  }

  /** recomputes RGB from the current HSV, updates swatch and label, emits the change, and repaints the picker. */
  private updateColor(): void {
    const c = hsvToRgb(this._hue, this._sat, this._val);
    const r = c[0];
    const g = c[1];
    const b = c[2];
    this._lastNormR = r;
    this._lastNormG = g;
    this._lastNormB = b;
    this._swatch.bgColor = packRGBA(r, g, b, this._alpha);
    this._swatch.markDirty();
    this._valueLabel.text = formatColorDisplay(r, g, b, this._alpha, this._displayFormat);
    this._valueLabel.markDirty();
    this.emitValue(r, g, b, this._alpha);
    if (this._svWidget) {
      this._svWidget.markDirty();
    }
    if (this._hueWidget) {
      this._hueWidget.markDirty();
    }
    if (this._alphaWidget) {
      this._alphaWidget.markDirty();
    }
  }

  /** walks up to the topmost ancestor, used as the parent for the picker and backdrop so they escape any clipping. */
  private getSurfaceRoot(): Box | null {
    let widget = this.parent;
    while (widget && widget.parent) {
      widget = widget.parent;
    }
    return widget as Box | null;
  }

  /**
   * Lazily builds the picker on first open: a backdrop that closes on click, the
   * saturation/value square, the hue bar, and an alpha bar when alpha is
   * enabled. Each sub-widget draws its gradient and drives its drag handler.
   */
  private ensurePickerWidgets(): void {
    if (this._picker) {
      return;
    }

    const pickerHeight =
      DEFAULTS.colorSvSize +
      DEFAULTS.colorHueBarHeight +
      (this._hasAlpha ? DEFAULTS.colorAlphaBarHeight + DEFAULTS.colorPickerPadding : 0) +
      DEFAULTS.colorPickerPadding * 3;

    const backdrop = new Box();
    backdrop.absolute = true;
    backdrop.anchorTop = 0;
    backdrop.anchorLeft = 0;
    backdrop.anchorRight = 0;
    backdrop.anchorBottom = 0;
    backdrop.bgColor = DEFAULTS.backdropColor;
    backdrop.onPointerDown = (): boolean => {
      this.closePicker();
      return true;
    };

    const picker = new Box();
    picker.absolute = true;
    picker.sizingX = "fixed";
    picker.sizingY = "fixed";
    picker.preferredWidth = PICKER_WIDTH;
    picker.preferredHeight = pickerHeight;
    picker.borderWidth = DEFAULTS.colorPickerBorderWidth;
    picker.setPaddingAll(DEFAULTS.colorPickerPadding);
    picker.layout = new StackLayout("vertical", DEFAULTS.colorPickerPadding, "start", "stretch");

    const svWidget = new CanvasWidget();
    svWidget.sizingX = "grow";
    svWidget.sizingY = "fixed";
    svWidget.preferredHeight = DEFAULTS.colorSvSize;
    svWidget.onDraw = (renderer: Renderer, _theme: Theme, w: number, h: number) => {
      this.drawSVGradient(renderer, w, h);
    };
    svWidget.onPointerDown = (_pid: number, x: number, y: number, _btn: number): boolean => {
      this._draggingSV = true;
      this.updateSV(x, y, svWidget.width, svWidget.height);
      return true;
    };
    svWidget.onPointerMove = (_pid: number, x: number, y: number): void => {
      if (this._draggingSV) {
        this.updateSV(x, y, svWidget.width, svWidget.height);
      }
    };
    svWidget.onPointerUp = (): void => {
      this._draggingSV = false;
    };
    this._svWidget = svWidget;
    picker.addChild(svWidget);

    buildHueBarColors();

    const hueWidget = new CanvasWidget();
    hueWidget.sizingX = "grow";
    hueWidget.sizingY = "fixed";
    hueWidget.preferredHeight = DEFAULTS.colorHueBarHeight;
    hueWidget.onDraw = (renderer: Renderer, _theme: Theme, w: number, h: number) => {
      this.drawHueBar(renderer, w, h);
    };
    hueWidget.onPointerDown = (_pid: number, x: number, _y: number, _btn: number): boolean => {
      this._draggingHue = true;
      this.updateHue(x, hueWidget.width);
      return true;
    };
    hueWidget.onPointerMove = (_pid: number, x: number, _y: number): void => {
      if (this._draggingHue) {
        this.updateHue(x, hueWidget.width);
      }
    };
    hueWidget.onPointerUp = (): void => {
      this._draggingHue = false;
    };
    this._hueWidget = hueWidget;
    picker.addChild(hueWidget);

    if (this._hasAlpha) {
      const alphaWidget = new CanvasWidget();
      alphaWidget.sizingX = "grow";
      alphaWidget.sizingY = "fixed";
      alphaWidget.preferredHeight = DEFAULTS.colorAlphaBarHeight;
      alphaWidget.onDraw = (renderer: Renderer, _theme: Theme, w: number, h: number) => {
        this.drawAlphaBar(renderer, w, h);
      };
      alphaWidget.onPointerDown = (_pid: number, x: number, _y: number, _btn: number): boolean => {
        this._draggingAlpha = true;
        this.updateAlpha(x, alphaWidget.width);
        return true;
      };
      alphaWidget.onPointerMove = (_pid: number, x: number, _y: number): void => {
        if (this._draggingAlpha) {
          this.updateAlpha(x, alphaWidget.width);
        }
      };
      alphaWidget.onPointerUp = (): void => {
        this._draggingAlpha = false;
      };
      this._alphaWidget = alphaWidget;
      picker.addChild(alphaWidget);
    }

    this._backdrop = backdrop;
    this._picker = picker;
  }

  /** syncs from the value, anchors the picker below the swatch, themes it, and attaches it and the backdrop to root. */
  private openPicker(): void {
    if (this._open) {
      return;
    }
    this._open = true;
    this.syncFromValue();

    const root = this.getSurfaceRoot();
    if (!root) {
      return;
    }

    this.ensurePickerWidgets();
    const picker = this._picker!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const backdrop = this._backdrop!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

    picker.anchorLeft = this._swatch.absoluteX;
    picker.anchorTop = this._swatch.absoluteY + this._swatch.height;

    const theme = this.surface?.getTheme() as InspectTheme | undefined;
    picker.bgColor = theme?.bgPanelRaised ?? 0x333333ff;
    picker.borderColor = theme?.borderPanel ?? 0x555555ff;

    root.addChild(backdrop);
    root.addChild(picker);
    root.needsLayout = true;
  }

  /** removes the picker and backdrop from the root and clears any in-progress drags. */
  private closePicker(): void {
    if (!this._open) {
      return;
    }
    this._open = false;
    const root = this.getSurfaceRoot();
    if (root) {
      if (this._backdrop) {
        root.removeChild(this._backdrop);
      }
      if (this._picker) {
        root.removeChild(this._picker);
      }
    }
    this._draggingSV = false;
    this._draggingHue = false;
    this._draggingAlpha = false;
  }

  /** maps a point in the SV square to saturation (x) and value (inverted y), then updates the color. */
  private updateSV(x: number, y: number, w: number, h: number): void {
    this._sat = Math.max(0, Math.min(1, x / Math.max(1, w)));
    this._val = Math.max(0, Math.min(1, 1 - y / Math.max(1, h)));
    this.updateColor();
  }

  /** maps a point on the hue bar to a 0..360 hue, invalidates the SV cache, and updates the color. */
  private updateHue(x: number, w: number): void {
    this._hue = Math.max(0, Math.min(360, (x / Math.max(1, w)) * 360));
    this._svCacheHue = -1;
    this.updateColor();
  }

  /** maps a point on the alpha bar to a 0..1 alpha and updates the color. */
  private updateAlpha(x: number, w: number): void {
    this._alpha = Math.max(0, Math.min(1, x / Math.max(1, w)));
    this.updateColor();
  }

  /** draws the saturation/value square from a per-hue cached grid and overlays the selection crosshair. */
  private drawSVGradient(renderer: Renderer, w: number, h: number): void {
    const steps = DEFAULTS.colorSvSteps;
    const stepW = w / steps;
    const stepH = h / steps;
    const ceilW = Math.ceil(stepW);
    const ceilH = Math.ceil(stepH);

    if (!this._svCache || this._svCacheHue !== this._hue) {
      if (!this._svCache) {
        this._svCache = new Uint32Array(steps * steps);
      }
      this._svCacheHue = this._hue;
      for (let ix = 0; ix < steps; ix++) {
        for (let iy = 0; iy < steps; iy++) {
          const s = (ix + 0.5) / steps;
          const v = 1 - (iy + 0.5) / steps;
          const c = hsvToRgb(this._hue, s, v);
          this._svCache[iy * steps + ix] = packRGBA(c[0], c[1], c[2], 1);
        }
      }
    }

    for (let ix = 0; ix < steps; ix++) {
      for (let iy = 0; iy < steps; iy++) {
        renderer.fillRect((ix * stepW) | 0, (iy * stepH) | 0, ceilW, ceilH, this._svCache[iy * steps + ix]);
      }
    }

    const crossX = (this._sat * w) | 0;
    const crossY = ((1 - this._val) * h) | 0;
    const arm = DEFAULTS.colorCrosshairArm;
    renderer.fillRect(crossX - arm, crossY, arm * 2 + 1, 1, 0xffffffff);
    renderer.fillRect(crossX, crossY - arm, 1, arm * 2 + 1, 0xffffffff);
  }

  /** draws the hue bar from the shared color cache and marks the current hue. */
  private drawHueBar(renderer: Renderer, w: number, h: number): void {
    const steps = DEFAULTS.colorHueSteps;
    const stepW = w / steps;
    const ceilW = Math.ceil(stepW);
    for (let i = 0; i < steps; i++) {
      renderer.fillRect((i * stepW) | 0, 0, ceilW, h, _hueBarColors[i]);
    }
    renderer.fillRect(((this._hue / 360) * w - 1) | 0, 0, DEFAULTS.colorHueMarkerWidth, h, 0xffffffff);
  }

  /** draws a checkerboard under a current-color alpha gradient (cached per HSV) and marks the current alpha. */
  private drawAlphaBar(renderer: Renderer, w: number, h: number): void {
    const checkSize = DEFAULTS.colorAlphaCheckSize;
    for (let cx = 0; cx < w; cx += checkSize) {
      for (let cy = 0; cy < h; cy += checkSize) {
        const dark = (cx / checkSize + cy / checkSize) % 2 === 0;
        renderer.fillRect(
          cx,
          cy,
          Math.min(checkSize, w - cx),
          Math.min(checkSize, h - cy),
          dark ? 0x999999ff : 0xccccccff
        );
      }
    }
    const alphaSteps = DEFAULTS.colorAlphaSteps;
    if (
      !this._alphaCache ||
      this._alphaCacheHue !== this._hue ||
      this._alphaCacheSat !== this._sat ||
      this._alphaCacheVal !== this._val
    ) {
      if (!this._alphaCache) {
        this._alphaCache = new Uint32Array(alphaSteps);
      }
      this._alphaCacheHue = this._hue;
      this._alphaCacheSat = this._sat;
      this._alphaCacheVal = this._val;
      const c = hsvToRgb(this._hue, this._sat, this._val);
      for (let i = 0; i < alphaSteps; i++) {
        const a = (i + 0.5) / alphaSteps;
        this._alphaCache[i] = packRGBA(c[0], c[1], c[2], a);
      }
    }
    const stepW = w / alphaSteps;
    const ceilW = Math.ceil(stepW);
    for (let i = 0; i < alphaSteps; i++) {
      renderer.fillRect((i * stepW) | 0, 0, ceilW, h, this._alphaCache[i]);
    }
    renderer.fillRect((this._alpha * w - 1) | 0, 0, DEFAULTS.colorHueMarkerWidth, h, 0xffffffff);
  }

  /** re-reads the bound value and updates the swatch and label. */
  public refresh(): void {
    this.syncFromValue();
  }

  /** opens the popup picker on the first pointer press. */
  public override onPointerDown(_pointerId: number, _x: number, _y: number, _button: number): boolean {
    if (!this._open) {
      this.openPicker();
    }
    return true;
  }

  /** applies theme colors to the value background and label. */
  public override applyTheme(theme: Theme): void {
    super.applyTheme(theme);
    this._valueBg.bgColor = theme.bgInput;
    this._valueLabel.color = theme.textValue;
  }

  /** returns the control configuration. */
  public get config(): GuiColorConfig {
    return this._config;
  }
}
