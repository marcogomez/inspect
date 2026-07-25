import { Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** orientation for a visual divider line. */
export type SeparatorDirection = "horizontal" | "vertical";

/** thin line widget used as a visual divider between sections. */
export class Separator extends Widget {
  /** orientation of the separator line. */
  public direction: SeparatorDirection = "horizontal";
  /** fill color of the separator line. */
  public color: number = DEFAULTS.separatorDefaultColor;
  /** line thickness in pixels. */
  public thickness = DEFAULTS.separatorDefaultThickness;

  /** draws the line centered along its cross axis, spanning the full length. */
  protected override drawSelf(renderer: Renderer, _theme: Theme): void {
    if (this.direction === "horizontal") {
      const offsetY = ((this.height - this.thickness) / 2) | 0;
      renderer.fillRect(0, offsetY, this.width, this.thickness, this.color);
    } else {
      const offsetX = ((this.width - this.thickness) / 2) | 0;
      renderer.fillRect(offsetX, 0, this.thickness, this.height, this.color);
    }
  }
}
