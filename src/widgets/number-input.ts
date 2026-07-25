import { THEME_DEFAULT, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";
import type { InspectTheme } from "../themes/inspect-theme";

const SCRUB_HIT_WIDTH = DEFAULTS.scrubHitWidth;
const SCRUB_LINE_WIDTH = DEFAULTS.scrubLineWidth;
const SCRUB_LINE_INSET = DEFAULTS.scrubLineInset;
const SCRUB_LINE_LEFT = DEFAULTS.scrubLineLeft;

/** numeric input widget with pointer-scrub and inline text editing. */
export class NumberInput extends Widget {
  /** current numeric value. */
  public numValue = 0;
  /** minimum allowed value. */
  public min = 0;
  /** maximum allowed value. */
  public max = 1;
  /** step size for snapping. */
  public step = 1;
  /** number of decimal places in the formatted display. */
  public decimals = 0;
  /** called on every value change during scrubbing or editing. */
  public onChange: ((value: number) => void) | null = null;
  /** called once when a scrub or edit session ends. */
  public onCommit: ((value: number) => void) | null = null;

  /** background color override. */
  public bgColor: number = THEME_DEFAULT;
  /** text color override. */
  public textColor: number = THEME_DEFAULT;
  /** corner radius of the background rectangle. */
  public borderRadius = DEFAULTS.sliderValueBgRadius;
  /** right padding for the displayed number text. */
  public paddingRight = DEFAULTS.sliderValuePaddingRight;

  private scrubHovered = false;
  private scrubDragging = false;
  private scrubPointerId = -1;
  private scrubOriginValue = 0;
  private scrubOriginX = 0;
  private pointerScale = 0.1;

  private editing = false;
  private editInput: HTMLInputElement | null = null;
  private editCleanup: (() => void) | null = null;

  private cachedText = "";
  private cachedValue = NaN;

  /** recalculates pointer scrub sensitivity based on step magnitude. */
  public updatePointerScale(): void {
    const base = Math.abs(this.step);
    // one order of magnitude below step for sub-step precision during pointer scrubbing
    this.pointerScale = base === 0 ? 0.1 : Math.pow(10, Math.floor(Math.log10(base)) - 1);
  }

  /** formats the value to the configured decimal places, caching the string until the value changes. */
  private formatValue(): string {
    if (this.numValue !== this.cachedValue) {
      this.cachedValue = this.numValue;
      this.cachedText = this.decimals === 0 ? String(Math.round(this.numValue)) : this.numValue.toFixed(this.decimals);
    }
    return this.cachedText;
  }

  /** paints the background, scrub handle line (lit while hovered/dragging), and value text unless editing. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    const w = this.width;
    const h = this.height;
    const t = theme as InspectTheme;

    const bg = this.bgColor === THEME_DEFAULT ? theme.bgInput : this.bgColor;
    renderer.fillRoundedRect(0, 0, w, h, this.borderRadius, bg);

    const lineColor =
      this.scrubHovered || this.scrubDragging ? DEFAULTS.scrubLineHoverColor : DEFAULTS.scrubLineNormalColor;
    const lineH = h - SCRUB_LINE_INSET * 2;
    const lineY = SCRUB_LINE_INSET;
    renderer.fillRoundedRect(SCRUB_LINE_LEFT, lineY, SCRUB_LINE_WIDTH, lineH, 1, lineColor);

    if (!this.editing) {
      const font = t.fontAtlas;
      if (font) {
        const text = this.formatValue();
        const textW = text.length * font.charWidth;
        const tx = w - this.paddingRight - textW;
        const ty = ((h - font.lineHeight) / 2) | 0;
        const tc = this.textColor === THEME_DEFAULT ? theme.textValue : this.textColor;
        renderer.drawText(font, text, tx, ty + (t.textOffsetY ?? 0), tc);
      }
    }
  }

  /** clears the scrub-zone hover highlight when the pointer leaves. */
  public override onPointerLeave(): void {
    if (this.scrubHovered) {
      this.scrubHovered = false;
      this.markDirty();
    }
  }

  /** while dragging, maps horizontal movement to a snapped, clamped value change; otherwise tracks scrub-zone hover. */
  public override onPointerMove(pointerId: number, x: number, _y: number): void {
    if (this.scrubDragging && pointerId === this.scrubPointerId) {
      const dx = x - this.scrubOriginX;
      const raw = this.scrubOriginValue + dx * this.pointerScale;
      const snapped = this.snap(raw);
      const clamped = Math.max(this.min, Math.min(this.max, snapped));
      if (clamped !== this.numValue) {
        this.numValue = clamped;
        if (this.onChange) {
          this.onChange(clamped);
        }
        this.markDirty();
      }
      return;
    }

    const inScrubZone = x >= 0 && x < SCRUB_HIT_WIDTH;
    if (inScrubZone !== this.scrubHovered) {
      this.scrubHovered = inScrubZone;
      this.markDirty();
    }
  }

  /** starts a scrub drag when the press lands in the left handle zone, otherwise opens the inline text editor. */
  public override onPointerDown(pointerId: number, x: number, _y: number, button: number): boolean {
    if (button !== 0 || !this.enabled) {
      return false;
    }

    if (x < SCRUB_HIT_WIDTH) {
      this.scrubDragging = true;
      this.scrubPointerId = pointerId;
      this.scrubOriginValue = this.numValue;
      this.scrubOriginX = x;
      this.scrubHovered = true;
      this.markDirty();
      return true;
    }

    this.startEditing();
    return true;
  }

  /** ends a scrub drag and fires the commit callback with the final value. */
  public override onPointerUp(pointerId: number, _x: number, _y: number, _button: number): void {
    if (this.scrubDragging && pointerId === this.scrubPointerId) {
      this.scrubDragging = false;
      this.scrubPointerId = -1;
      if (this.onCommit) {
        this.onCommit(this.numValue);
      }
      this.markDirty();
    }
  }

  /** rounds a value to the nearest multiple of step, or returns it unchanged when step is not positive. */
  private snap(raw: number): number {
    if (this.step <= 0) {
      return raw;
    }
    return Math.round(raw / this.step) * this.step;
  }

  /**
   * Opens a native text input overlaid on the widget's on-screen rect for
   * direct editing. The rect is mapped from widget-absolute coordinates to page
   * coordinates, and the input commits on Enter or blur and cancels on Escape.
   */
  private startEditing(): void {
    if (this.editing || !this.surface) {
      return;
    }

    this.editing = true;
    this.markDirty();

    const canvas = this.surface.canvas;
    const rect = canvas.getBoundingClientRect();
    // the surface sizes its backing store in css pixels (no devicePixelRatio
    // scaling), so the backing-to-page scale is simply rect over canvas size.
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const inputLeft = rect.left + this.absoluteX * scaleX;
    const inputTop = rect.top + this.absoluteY * scaleY;
    const inputWidth = this.width * scaleX;
    const inputHeight = this.height * scaleY;

    const input = document.createElement("input");
    input.type = "text";
    input.value = this.formatValue();
    input.style.position = "fixed";
    input.style.left = `${inputLeft}px`;
    input.style.top = `${inputTop}px`;
    input.style.width = `${inputWidth}px`;
    input.style.height = `${inputHeight}px`;
    input.style.boxSizing = "border-box";
    input.style.padding = `0 ${this.paddingRight}px`;
    input.style.margin = "0";
    input.style.border = "none";
    input.style.outline = "none";
    input.style.borderRadius = `${this.borderRadius}px`;
    input.style.backgroundColor = DEFAULTS.editInputBg;
    input.style.color = DEFAULTS.editInputColor;
    input.style.fontFamily = DEFAULTS.panelDefaultFontFamily;
    input.style.fontSize = `${DEFAULTS.panelDefaultFontSize}px`;
    input.style.textAlign = "right";
    input.style.zIndex = DEFAULTS.editInputZIndex;
    input.style.caretColor = DEFAULTS.editInputCaretColor;

    document.body.appendChild(input);
    this.editInput = input;

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    const commit = () => {
      const parsed = parseFloat(input.value);
      if (!isNaN(parsed)) {
        const snapped = this.snap(parsed);
        const clamped = Math.max(this.min, Math.min(this.max, snapped));
        this.numValue = clamped;
        if (this.onChange) {
          this.onChange(clamped);
        }
        if (this.onCommit) {
          this.onCommit(clamped);
        }
      }
      this.stopEditing();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.stopEditing();
      }
      e.stopPropagation();
    };

    const onBlur = () => {
      commit();
    };

    input.addEventListener("keydown", onKeyDown);
    input.addEventListener("blur", onBlur);

    this.editCleanup = () => {
      input.removeEventListener("keydown", onKeyDown);
      input.removeEventListener("blur", onBlur);
    };
  }

  /** closes the inline editor, removing its element and listeners and forcing a value reformat. */
  private stopEditing(): void {
    if (!this.editing) {
      return;
    }
    this.editing = false;

    if (this.editCleanup) {
      this.editCleanup();
      this.editCleanup = null;
    }

    if (this.editInput) {
      this.editInput.remove();
      this.editInput = null;
    }

    this.cachedValue = NaN;
    this.markDirty();
  }

  /** tears down any active inline edit input element. */
  public dispose(): void {
    this.stopEditing();
  }
}
