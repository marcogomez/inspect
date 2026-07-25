import { THEME_DEFAULT, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { Separator } from "../widgets/separator";

import type { Theme } from "../core/theme";

/** Themed horizontal divider line between controls. */
export class GuiSeparator extends Widget {
  private readonly _separator: Separator;

  /** builds a fixed-height row holding a horizontal divider that fills its width. */
  constructor() {
    super();
    this.sizingX = "grow";
    this.sizingY = "fixed";
    this.preferredHeight = DEFAULTS.separatorHeight;

    this._separator = new Separator();
    this._separator.sizingX = "grow";
    this._separator.sizingY = "grow";
    this._separator.direction = "horizontal";
    this._separator.color = THEME_DEFAULT;
    this.addChild(this._separator);
  }

  /** applies theme color and thickness to the divider. */
  public applyTheme(theme: Theme): void {
    this._separator.color = theme.borderInset;
    this._separator.thickness = theme.separatorThickness;
  }
}
