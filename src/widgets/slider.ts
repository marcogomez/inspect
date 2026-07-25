import { THEME_DEFAULT, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

const KNOB_SHADOW_COLOR = DEFAULTS.sliderKnobShadowColor;

/** horizontal slider widget with track fill and circular thumb. */
export class Slider extends Widget {
  /** current slider value between min and max. */
  public value = 0;
  /** minimum value at the left edge. */
  public min = 0;
  /** maximum value at the right edge. */
  public max = 1;
  /** track background color override. */
  public trackColor: number = THEME_DEFAULT;
  /** filled portion color override. */
  public fillColor: number = THEME_DEFAULT;
  /** thumb circle color override. */
  public thumbColor: number = THEME_DEFAULT;
  /** corner radius of the track rectangle. */
  public trackRadius = DEFAULTS.sliderTrackRadius;
  /** called on every value change during drag. */
  public onChange: ((value: number) => void) | null = null;
  /** called once when the drag ends. */
  public onRelease: (() => void) | null = null;

  private dragging = false;
  private dragPointerId = -1;

  /** draws the track, the filled portion up to the current value, and the thumb with its drop shadow. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    const widgetWidth = this.width;
    const widgetHeight = this.height;
    const range = this.max - this.min;
    const ratio = range > 0 ? (this.value - this.min) / range : 0;

    const resolvedTrackColor = this.trackColor === THEME_DEFAULT ? theme.bgInput : this.trackColor;
    const resolvedThumbColor = this.thumbColor === THEME_DEFAULT ? DEFAULTS.sliderDefaultThumbColor : this.thumbColor;
    const resolvedFillColor = this.fillColor === THEME_DEFAULT ? theme.bgSelected : this.fillColor;

    const trackH = DEFAULTS.sliderTrackHeight;
    const trackY = ((widgetHeight - trackH) / 2) | 0;
    const r = this.trackRadius;

    renderer.fillRoundedRect(0, trackY, widgetWidth, trackH, r, resolvedTrackColor);

    const fillW = (ratio * widgetWidth) | 0;
    if (fillW > 0) {
      renderer.fillRoundedRect(0, trackY, fillW, trackH, r, resolvedFillColor);
    }

    const thumbRadius = (Math.min(widgetHeight, DEFAULTS.sliderThumbMaxDiameter) / 2) | 0;
    // inset the travel range by the thumb diameter so the thumb stays inside the track
    const thumbCX = (ratio * (widgetWidth - thumbRadius * 2) + thumbRadius) | 0;
    const thumbCY = (widgetHeight / 2) | 0;
    renderer.fillCircle(thumbCX, thumbCY + DEFAULTS.sliderKnobShadowOffsetY, thumbRadius, KNOB_SHADOW_COLOR);
    renderer.fillCircle(thumbCX, thumbCY, thumbRadius, resolvedThumbColor);
  }

  /** begins a drag on primary-button press and sets the value from the pointer position. */
  public override onPointerDown(pointerId: number, x: number, _y: number, button: number): boolean {
    if (button !== 0 || !this.enabled) {
      return false;
    }
    this.dragging = true;
    this.dragPointerId = pointerId;
    this.updateValueFromPosition(x);
    return true;
  }

  /** tracks the captured pointer during a drag and updates the value from its position. */
  public override onPointerMove(pointerId: number, x: number, _y: number): void {
    if (!this.dragging || pointerId !== this.dragPointerId) {
      return;
    }
    this.updateValueFromPosition(x);
  }

  /** ends the drag and fires onRelease when the captured pointer lifts. */
  public override onPointerUp(pointerId: number, _x: number, _y: number, _button: number): void {
    if (pointerId === this.dragPointerId) {
      this.dragging = false;
      this.dragPointerId = -1;
      if (this.onRelease) {
        this.onRelease();
      }
    }
  }

  /** maps an x coordinate to a value in the min..max range, firing onChange and repainting on change. */
  private updateValueFromPosition(x: number): void {
    const widgetWidth = this.width;
    if (widgetWidth <= 0) {
      return;
    }
    const ratio = Math.max(0, Math.min(1, x / widgetWidth));
    const nextValue = this.min + ratio * (this.max - this.min);
    if (nextValue !== this.value) {
      this.value = nextValue;
      if (this.onChange) {
        this.onChange(this.value);
      }
      this.markDirty();
    }
  }
}
