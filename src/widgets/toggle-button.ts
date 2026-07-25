import { Button } from "./button";
import { THEME_DEFAULT } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** button that toggles between active and inactive states on each click. */
export class ToggleButton extends Button {
  /** whether the button is currently in the active (toggled on) state. */
  public active = false;
  /** background color override for the active state. */
  public activeStateBg: number = THEME_DEFAULT;
  /** border color drawn around the button when active. */
  public activeBorderColor: number = DEFAULTS.toggleActiveBorderColor;
  /** called when the toggle state changes; receives the new active state. */
  public onToggle: ((active: boolean) => void) | null = null;

  /** wires the click handler to flip the active state and fire onToggle. */
  constructor() {
    super();
    this.onClick = () => {
      this.active = !this.active;
      if (this.onToggle) {
        this.onToggle(this.active);
      }
      this.markDirty();
    };
  }

  /** in the active state, draws the base button with the active background plus an outline; else draws normally. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    if (this.active) {
      const originalBackground = this.bgColor;
      this.bgColor = this.activeStateBg === THEME_DEFAULT ? theme.bgButtonActive : this.activeStateBg;
      super.drawSelf(renderer, theme);
      this.bgColor = originalBackground;
      if (this.activeBorderColor) {
        renderer.strokeRect(0, 0, this.width, this.height, this.activeBorderColor, 1);
      }
    } else {
      super.drawSelf(renderer, theme);
    }
  }
}
