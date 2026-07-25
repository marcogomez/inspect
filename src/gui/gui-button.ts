import { Button } from "../widgets/button";

import type { Theme } from "../core/theme";

/** Themed action button for use within the inspect panel. */
export class GuiButton extends Button {
  /** builds a grow-width button; the title is uppercased for the panel's button style. */
  constructor(title: string, onClick?: () => void) {
    super();
    this.text = title.toUpperCase();
    this.sizingX = "grow";
    this.sizingY = "fixed";
    if (onClick) {
      this.onClick = onClick;
    }
  }

  /** applies theme values to the button. */
  public applyTheme(theme: Theme): void {
    this.preferredHeight = theme.buttonHeight;
    this.borderRadius = theme.borderRadius;
    this.borderColor = theme.borderInset;
    this.borderWidth = 1;
  }
}
