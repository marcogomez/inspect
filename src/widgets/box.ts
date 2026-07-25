import { Widget } from "../core/widget";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** Generic container widget with optional background fill, border, and per-edge border colors. */
export class Box extends Widget {
  /** background fill color; zero for no fill. */
  public bgColor: number = 0;
  /** full-perimeter border color; zero disables the border. */
  public borderColor: number = 0;
  /** border stroke width in pixels. */
  public borderWidth: number = 0;
  /** corner radius applied to the background and full border. */
  public borderRadius: number = 0;
  /** color of a 1px top edge line; zero disables it. */
  public borderTopColor: number = 0;
  /** color of a 1px bottom edge line; zero disables it. */
  public borderBottomColor: number = 0;
  /** color of a 1px left edge line; zero disables it. */
  public borderLeftColor: number = 0;
  /** color of a 1px right edge line; zero disables it. */
  public borderRightColor: number = 0;

  /** paints the background, the full border, then any single-edge border lines. */
  protected override drawSelf(renderer: Renderer, _theme: Theme): void {
    const widgetWidth = this.width;
    const widgetHeight = this.height;
    const cornerRadius = this.borderRadius;
    if (this.bgColor) {
      if (cornerRadius > 0) {
        renderer.fillRoundedRect(0, 0, widgetWidth, widgetHeight, cornerRadius, this.bgColor);
      } else {
        renderer.fillRect(0, 0, widgetWidth, widgetHeight, this.bgColor);
      }
    }
    if (this.borderColor && this.borderWidth > 0) {
      if (cornerRadius > 0) {
        renderer.strokeRoundedRect(0, 0, widgetWidth, widgetHeight, cornerRadius, this.borderColor, this.borderWidth);
      } else {
        renderer.strokeRect(0, 0, widgetWidth, widgetHeight, this.borderColor, this.borderWidth);
      }
    }
    if (this.borderTopColor) {
      renderer.fillRect(0, 0, widgetWidth, 1, this.borderTopColor);
    }
    if (this.borderBottomColor) {
      renderer.fillRect(0, widgetHeight - 1, widgetWidth, 1, this.borderBottomColor);
    }
    if (this.borderLeftColor) {
      renderer.fillRect(0, 0, 1, widgetHeight, this.borderLeftColor);
    }
    if (this.borderRightColor) {
      renderer.fillRect(widgetWidth - 1, 0, 1, widgetHeight, this.borderRightColor);
    }
  }
}
