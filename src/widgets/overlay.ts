import { SLOT_HEIGHT, SLOT_WIDTH, SLOT_X, SLOT_Y, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** full-size overlay widget with optional backdrop and dismiss-on-click behavior. */
export class Overlay extends Widget {
  /** backdrop fill color; zero for transparent. */
  public backdropColor: number = DEFAULTS.overlayDefaultBackdropColor;
  /** when true, clicking outside children triggers dismissal. */
  public dismissOnBackdrop = true;
  /** callback invoked when the overlay is dismissed via backdrop click. */
  public onDismiss: (() => void) | null = null;

  /** fills the backdrop across the whole overlay when a backdrop color is set. */
  protected override drawSelf(renderer: Renderer, _theme: Theme): void {
    if (this.backdropColor) {
      renderer.fillRect(0, 0, this.width, this.height, this.backdropColor);
    }
  }

  /** dismisses the overlay when the press lands on the backdrop rather than any child, consuming the event. */
  public override onPointerDown(_pointerId: number, x: number, y: number, _button: number): boolean {
    if (!this.dismissOnBackdrop) {
      return false;
    }
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (!child.visible) {
        continue;
      }
      const childGeometry = child.geometry;
      if (
        x >= childGeometry[SLOT_X] &&
        x < childGeometry[SLOT_X] + childGeometry[SLOT_WIDTH] &&
        y >= childGeometry[SLOT_Y] &&
        y < childGeometry[SLOT_Y] + childGeometry[SLOT_HEIGHT]
      ) {
        return false;
      }
    }
    if (this.onDismiss) {
      this.onDismiss();
    }
    return true;
  }
}
