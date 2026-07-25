import { Widget } from "../core/widget";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** callback signature for custom draw logic within a CanvasWidget. */
export type CustomDrawFn = (renderer: Renderer, theme: Theme, width: number, height: number) => void;

/** widget that delegates its rendering to a user-supplied draw callback. */
export class CanvasWidget extends Widget {
  /** draw callback invoked each frame; receives renderer, theme, and widget dimensions. */
  public onDraw: CustomDrawFn | null = null;

  /** invokes the user draw callback, if set, with the renderer, theme, and current size. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    if (this.onDraw) {
      this.onDraw(renderer, theme, this.width, this.height);
    }
  }
}
