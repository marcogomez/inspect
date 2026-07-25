import { THEME_DEFAULT, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** clickable button widget with hover and active states. */
export class Button extends Widget {
  /** text displayed centered within the button. */
  public text = "";
  /** text color override; uses theme default when set to THEME_DEFAULT. */
  public textColor: number = THEME_DEFAULT;
  /** background color override. */
  public bgColor: number = THEME_DEFAULT;
  /** background color when hovered. */
  public hoverColor: number = THEME_DEFAULT;
  /** background color when pressed. */
  public activeColor: number = THEME_DEFAULT;
  /** border stroke color; zero disables the border. */
  public borderColor: number = 0;
  /** border stroke width in pixels. */
  public borderWidth: number = 0;
  /** corner radius for rounded button shape. */
  public borderRadius: number = 0;
  /** alpha multiplier applied when the button is disabled. */
  public disabledAlpha = DEFAULTS.buttonDisabledAlpha;
  /** callback invoked on click or keyboard activation. */
  public onClick: (() => void) | null = null;

  private hovered = false;
  private pressed = false;

  /** marks the button focusable so it can be activated by keyboard. */
  constructor() {
    super();
    this.focusable = true;
  }

  /** whether the pointer is currently hovering over this button. */
  public get isHovered(): boolean {
    return this.hovered;
  }

  /** whether the button is currently being pressed. */
  public get isPressed(): boolean {
    return this.pressed;
  }

  /** intrinsic label width in pixels; zero when the button has children or no text. */
  public override getContentWidth(): number {
    if (this.children.length > 0 || !this.text) {
      return 0;
    }
    const font = this.resolveFont();
    if (!font) {
      return 0;
    }
    return this.text.length * font.charWidth;
  }

  /** intrinsic label height in pixels; zero when the button has children or no text. */
  public override getContentHeight(): number {
    if (this.children.length > 0 || !this.text) {
      return 0;
    }
    const font = this.resolveFont();
    if (!font) {
      return 0;
    }
    return font.lineHeight;
  }

  /** paints the background for the hover/press state, the optional border, and centered text; dims when disabled. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    const widgetWidth = this.width;
    const widgetHeight = this.height;

    if (!this.enabled) {
      renderer.pushAlpha(this.disabledAlpha);
    }

    const baseBg = this.bgColor === THEME_DEFAULT ? theme.bgButton : this.bgColor;
    const hoverBg = this.hoverColor === THEME_DEFAULT ? theme.bgButtonHover : this.hoverColor;
    const activeBg = this.activeColor === THEME_DEFAULT ? theme.bgButtonActive : this.activeColor;

    let background = baseBg;

    if (this.pressed) {
      background = activeBg;
    } else if (this.hovered) {
      background = hoverBg;
    }

    const cornerRadius = this.borderRadius;
    if (cornerRadius > 0) {
      renderer.fillRoundedRect(0, 0, widgetWidth, widgetHeight, cornerRadius, background);
    } else {
      renderer.fillRect(0, 0, widgetWidth, widgetHeight, background);
    }

    if (this.borderColor && this.borderWidth > 0) {
      if (cornerRadius > 0) {
        renderer.strokeRoundedRect(0, 0, widgetWidth, widgetHeight, cornerRadius, this.borderColor, this.borderWidth);
      } else {
        renderer.strokeRect(0, 0, widgetWidth, widgetHeight, this.borderColor, this.borderWidth);
      }
    }

    if (this.children.length === 0 && this.text) {
      const font = theme.fontAtlas;
      if (font) {
        const scaleFactor = this.autoFitScale ? this.computedScale : 1;
        const scaledCharWidth = (font.charWidth * scaleFactor) | 0;
        const scaledLineHeight = (font.lineHeight * scaleFactor) | 0;
        const textWidth = this.text.length * scaledCharWidth;
        const textX = Math.round((widgetWidth - textWidth) / 2);
        const textY = Math.round((widgetHeight - scaledLineHeight) / 2);
        const color = this.textColor === THEME_DEFAULT ? theme.textPrimary : this.textColor;
        renderer.drawText(font, this.text, textX, textY, color, scaleFactor !== 1 ? scaleFactor : undefined);
      }
    }

    if (!this.enabled) {
      renderer.popAlpha();
    }
  }

  /** enters the pressed state and claims the pointer, unless disabled. */
  public override onPointerDown(pointerId: number, x: number, y: number, button: number): boolean {
    if (!this.enabled) {
      return false;
    }
    this.pressed = true;
    this.markDirty();
    return super.onPointerDown(pointerId, x, y, button) || true;
  }

  /** fires onClick when released while still pressed and enabled, then clears the pressed state. */
  public override onPointerUp(pointerId: number, x: number, y: number, button: number): void {
    if (this.pressed && this.enabled && this.onClick) {
      this.onClick();
    }
    this.pressed = false;
    this.markDirty();
    super.onPointerUp(pointerId, x, y, button);
  }

  /** enters the hover state. */
  public override onPointerEnter(): void {
    this.hovered = true;
    this.markDirty();
  }

  /** clears hover and any pressed state when the pointer leaves. */
  public override onPointerLeave(): void {
    this.hovered = false;
    this.pressed = false;
    this.markDirty();
  }

  /** activates the button on Enter or Space when enabled. */
  public override onKeyDown(key: string, code: string, ctrl: boolean, shift: boolean, alt: boolean): boolean {
    if ((code === "Enter" || code === "Space") && this.enabled && this.onClick) {
      this.onClick();
      return true;
    }
    return super.onKeyDown(key, code, ctrl, shift, alt);
  }
}
