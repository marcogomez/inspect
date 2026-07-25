import { THEME_DEFAULT, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** editable single-line text input widget with cursor, selection, and placeholder. */
export class TextInput extends Widget {
  /** current text content. */
  public text = "";
  /** character index of the editing cursor. */
  public cursorPos = 0;
  /** start index of the selection range; -1 when no selection. */
  public selectionStart = -1;
  /** end index of the selection range (exclusive); -1 when no selection. */
  public selectionEnd = -1;
  /** placeholder text shown when unfocused and empty. */
  public placeholder = "";
  /** text color override. */
  public textColor: number = THEME_DEFAULT;
  /** placeholder text color override. */
  public placeholderColor: number = THEME_DEFAULT;
  /** background fill color override. */
  public bgColor: number = THEME_DEFAULT;
  /** cursor line color override. */
  public cursorColor: number = THEME_DEFAULT;
  /** selection highlight color. */
  public selectionColor: number = DEFAULTS.textInputSelectionColor;
  /** corner radius of the background rectangle. */
  public borderRadius = 2;
  /** called on each text change from user input. */
  public onChange: ((text: string) => void) | null = null;

  private cursorVisible = true;

  /** marks the input focusable so it can receive keyboard focus. */
  constructor() {
    super();
    this.focusable = true;
  }

  /** draws the background, selection highlight, text or placeholder, and the cursor when focused. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    const widgetWidth = this.width;
    const widgetHeight = this.height;
    const font = theme.fontAtlas;
    if (!font) {
      return;
    }

    const background = this.bgColor === THEME_DEFAULT ? theme.bgInput : this.bgColor;
    if (this.borderRadius > 0) {
      renderer.fillRoundedRect(0, 0, widgetWidth, widgetHeight, this.borderRadius, background);
    } else {
      renderer.fillRect(0, 0, widgetWidth, widgetHeight, background);
    }

    const textY = ((widgetHeight - font.lineHeight) / 2) | 0;
    const padding = this.innerX || DEFAULTS.textInputPadding;

    if (this.text) {
      if (this.focused && this.selectionStart >= 0 && this.selectionEnd > this.selectionStart) {
        const selectionX = padding + this.selectionStart * font.charWidth;
        const selectionWidth = (this.selectionEnd - this.selectionStart) * font.charWidth;
        renderer.fillRect(selectionX, textY, selectionWidth, font.lineHeight, this.selectionColor);
      }
      const resolvedTextColor = this.textColor === THEME_DEFAULT ? theme.textPrimary : this.textColor;
      renderer.drawText(font, this.text, padding, textY, resolvedTextColor);
    } else if (this.placeholder && !this.focused) {
      const resolvedPlaceholderColor =
        this.placeholderColor === THEME_DEFAULT ? theme.textMuted : this.placeholderColor;
      renderer.drawText(font, this.placeholder, padding, textY, resolvedPlaceholderColor);
    }

    if (this.focused && this.cursorVisible) {
      const cursorX = padding + this.cursorPos * font.charWidth;
      const resolvedCursorColor = this.cursorColor === THEME_DEFAULT ? theme.textPrimary : this.cursorColor;
      renderer.fillRect(cursorX, textY, 1, font.lineHeight, resolvedCursorColor);
    }
  }

  /** shows the cursor and repaints when the input gains focus. */
  public override onFocus(): void {
    this.cursorVisible = true;
    this.markDirty();
  }

  /** clears the selection and repaints when the input loses focus. */
  public override onBlur(): void {
    this.selectionStart = -1;
    this.selectionEnd = -1;
    this.markDirty();
  }

  /** claims a primary-button press and shows the cursor. */
  public override onPointerDown(_pointerId: number, _x: number, _y: number, button: number): boolean {
    if (button !== 0) {
      return false;
    }
    this.resetBlink();
    this.markDirty();
    return true;
  }

  /**
   * handles editing keys (select-all, backspace, delete, cursor movement, home/end) and inserts printable
   * characters, calling onChange on any edit. returns true when the key was consumed.
   */
  public override onKeyDown(key: string, _code: string, ctrl: boolean, _shift: boolean, _alt: boolean): boolean {
    if (!this.enabled) {
      return false;
    }

    if (ctrl && key === "a") {
      this.selectionStart = 0;
      this.selectionEnd = this.text.length;
      this.markDirty();
      return true;
    }

    if (key === "Backspace") {
      if (this.hasSelection()) {
        this.deleteSelection();
      } else if (this.cursorPos > 0) {
        this.text = this.text.slice(0, this.cursorPos - 1) + this.text.slice(this.cursorPos);
        this.cursorPos--;
        if (this.onChange) {
          this.onChange(this.text);
        }
      }
      this.resetBlink();
      this.markDirty();
      return true;
    }

    if (key === "Delete") {
      if (this.hasSelection()) {
        this.deleteSelection();
      } else if (this.cursorPos < this.text.length) {
        this.text = this.text.slice(0, this.cursorPos) + this.text.slice(this.cursorPos + 1);
        if (this.onChange) {
          this.onChange(this.text);
        }
      }
      this.resetBlink();
      this.markDirty();
      return true;
    }

    if (key === "ArrowLeft") {
      if (this.cursorPos > 0) {
        this.cursorPos--;
      }
      this.clearSelection();
      this.resetBlink();
      this.markDirty();
      return true;
    }

    if (key === "ArrowRight") {
      if (this.cursorPos < this.text.length) {
        this.cursorPos++;
      }
      this.clearSelection();
      this.resetBlink();
      this.markDirty();
      return true;
    }

    if (key === "Home") {
      this.cursorPos = 0;
      this.clearSelection();
      this.resetBlink();
      this.markDirty();
      return true;
    }

    if (key === "End") {
      this.cursorPos = this.text.length;
      this.clearSelection();
      this.resetBlink();
      this.markDirty();
      return true;
    }

    if (key.length === 1 && !ctrl) {
      if (this.hasSelection()) {
        this.deleteSelection();
      }
      this.text = this.text.slice(0, this.cursorPos) + key + this.text.slice(this.cursorPos);
      this.cursorPos++;
      if (this.onChange) {
        this.onChange(this.text);
      }
      this.resetBlink();
      this.markDirty();
      return true;
    }

    return false;
  }

  /** true when a non-empty selection range is set. */
  private hasSelection(): boolean {
    return this.selectionStart >= 0 && this.selectionEnd > this.selectionStart;
  }

  /** removes the selected text, moves the cursor to the selection start, and fires onChange. */
  private deleteSelection(): void {
    if (!this.hasSelection()) {
      return;
    }
    this.text = this.text.slice(0, this.selectionStart) + this.text.slice(this.selectionEnd);
    this.cursorPos = this.selectionStart;
    this.clearSelection();
    if (this.onChange) {
      this.onChange(this.text);
    }
  }

  /** resets the selection range to empty. */
  private clearSelection(): void {
    this.selectionStart = -1;
    this.selectionEnd = -1;
  }

  /** forces the cursor visible so it appears immediately after input. */
  private resetBlink(): void {
    this.cursorVisible = true;
  }
}
