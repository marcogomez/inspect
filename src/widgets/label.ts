import { THEME_DEFAULT, Widget } from "../core/widget";

import type { FontAtlas } from "../core/atlas";
import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";
import type { HAlign, VAlign } from "../core/widget";

/** text label widget supporting multiline, alignment, ellipsis overflow, and custom fonts. */
export class Label extends Widget {
  /** text content; supports newlines for multiline rendering. */
  public text = "";
  /** text color override; uses theme default when set to THEME_DEFAULT. */
  public color: number = THEME_DEFAULT;
  /** horizontal text alignment. */
  public hAlign: HAlign = "left";
  /** vertical text alignment. */
  public vAlign: VAlign = "middle";
  /** optional font atlas override; falls back to theme font when null. */
  public customFont: FontAtlas | null = null;
  /** overflow mode: "clip" truncates silently, "ellipsis" appends a tilde. */
  public overflow: "clip" | "ellipsis" = "clip";
  /** text scale factor applied during rendering. */
  public scale = 1;
  /** vertical pixel offset applied after alignment calculation. */
  public textOffsetY = 0;

  private _cachedText = "";
  private _cachedLines: string[] = [];
  private _cachedEllipsisText = "";
  private _cachedEllipsisSource = "";
  private _cachedEllipsisMaxChars = -1;

  private _isMultiline = false;

  /** splits text into lines, caching the result and the single-versus-multiline flag until text changes. */
  private getLines(): string[] {
    if (this._cachedText !== this.text) {
      this._cachedText = this.text;
      if (this.text.indexOf("\n") === -1) {
        this._cachedLines[0] = this.text;
        this._cachedLines.length = 1;
        this._isMultiline = false;
      } else {
        this._cachedLines = this.text.split("\n");
        this._isMultiline = true;
      }
    }
    return this._cachedLines;
  }

  /** truncates text to maxChars and appends a tilde, caching the result for the same text and limit. */
  private getEllipsisText(text: string, maxChars: number): string {
    if (text === this._cachedEllipsisSource && maxChars === this._cachedEllipsisMaxChars) {
      return this._cachedEllipsisText;
    }
    this._cachedEllipsisSource = text;
    this._cachedEllipsisMaxChars = maxChars;
    this._cachedEllipsisText = maxChars > 0 ? text.slice(0, maxChars) + "~" : "";
    return this._cachedEllipsisText;
  }

  /** returns the widest line width in pixels at the effective scale. */
  public override getContentWidth(): number {
    const font = this.customFont ?? this.resolveFont();
    if (!font || !this.text) {
      return 0;
    }
    const effectiveScale = this.autoFitScale ? this.maxScale : this.scale;
    const scaledCharWidth = (font.charWidth * effectiveScale) | 0;
    const lines = this.getLines();
    if (!this._isMultiline) {
      return this.text.length * scaledCharWidth;
    }
    let maxLineWidth = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineWidth = lines[i].length * scaledCharWidth;
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
      }
    }
    return maxLineWidth;
  }

  /** returns the total text height in pixels at the effective scale. */
  public override getContentHeight(): number {
    const font = this.customFont ?? this.resolveFont();
    if (!font) {
      return 0;
    }
    const effectiveScale = this.autoFitScale ? this.maxScale : this.scale;
    const scaledLineHeight = (font.lineHeight * effectiveScale) | 0;
    this.getLines();
    if (!this._isMultiline) {
      return scaledLineHeight;
    }
    return this._cachedLines.length * scaledLineHeight;
  }

  /** draws text within the content box: single-line, or multi-line layout with vertical/horizontal alignment. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    if (!this.text) {
      return;
    }
    const font = this.customFont ?? theme.fontAtlas;
    if (!font) {
      return;
    }

    const contentWidth = this.innerWidth;
    const contentHeight = this.innerHeight;
    const contentX = this.innerX;
    const contentY = this.innerY;
    const textColor = this.color === THEME_DEFAULT ? theme.textPrimary : this.color;

    const scaleFactor = this.autoFitScale ? this.computedScale : this.scale;

    this.getLines();

    if (!this._isMultiline) {
      this.drawSingleLine(
        renderer,
        font,
        this.text,
        contentX,
        contentY,
        contentWidth,
        contentHeight,
        textColor,
        scaleFactor
      );
      return;
    }

    const scaledLineHeight = (font.lineHeight * scaleFactor) | 0;
    const scaledCharWidth = (font.charWidth * scaleFactor) | 0;
    const lines = this.getLines();
    const totalTextHeight = lines.length * scaledLineHeight;

    let drawY = contentY;
    if (this.vAlign === "middle") {
      drawY = Math.round(contentY + (contentHeight - totalTextHeight) / 2);
    } else if (this.vAlign === "bottom") {
      drawY = contentY + contentHeight - totalTextHeight;
    }
    drawY += this.textOffsetY;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        drawY += scaledLineHeight;
        continue;
      }
      const lineWidth = line.length * scaledCharWidth;
      let drawX = contentX;
      if (this.hAlign === "center") {
        drawX = Math.round(contentX + (contentWidth - lineWidth) / 2);
      } else if (this.hAlign === "right") {
        drawX = contentX + contentWidth - lineWidth;
      }
      renderer.drawText(font, line, drawX, drawY, textColor, scaleFactor !== 1 ? scaleFactor : undefined);
      drawY += scaledLineHeight;
    }
  }

  /** draws one line, applying ellipsis truncation on overflow and aligning it within the content box. */
  private drawSingleLine(
    renderer: Renderer,
    font: FontAtlas,
    text: string,
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number,
    textColor: number,
    scaleFactor: number
  ): void {
    const scaledCharWidth = (font.charWidth * scaleFactor) | 0;
    const scaledLineHeight = (font.lineHeight * scaleFactor) | 0;

    let displayText = text;
    const textWidth = text.length * scaledCharWidth;

    if (textWidth > contentWidth && this.overflow === "ellipsis" && scaledCharWidth > 0) {
      const maxChars = Math.max(0, Math.floor(contentWidth / scaledCharWidth) - 1);
      displayText = this.getEllipsisText(text, maxChars);
    }

    const displayWidth = displayText.length * scaledCharWidth;

    let drawX = contentX;
    if (this.hAlign === "center") {
      drawX = Math.round(contentX + (contentWidth - displayWidth) / 2);
    } else if (this.hAlign === "right") {
      drawX = contentX + contentWidth - displayWidth;
    }

    let drawY = contentY;
    if (this.vAlign === "middle") {
      drawY = Math.round(contentY + (contentHeight - scaledLineHeight) / 2);
    } else if (this.vAlign === "bottom") {
      drawY = contentY + contentHeight - scaledLineHeight;
    }
    drawY += this.textOffsetY;

    renderer.drawText(font, displayText, drawX, drawY, textColor, scaleFactor !== 1 ? scaleFactor : undefined);
  }
}
