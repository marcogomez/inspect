import { StackLayout } from "../core/layouts/stack-layout";
import { Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { Button } from "../widgets/button";

import type { Theme } from "../core/theme";

/** Configuration for a horizontal row of action buttons. */
export interface GuiButtonRowConfig {
  key: string;
  buttons: { title: string; onClick: () => void }[];
}

/** A horizontal strip of equally-sized action buttons. */
export class GuiButtonRow extends Widget {
  private readonly _config: GuiButtonRowConfig;
  private readonly _buttons: Button[] = [];

  /** builds one equally-weighted button per config entry, laid out in a horizontal row. */
  constructor(config: GuiButtonRowConfig) {
    super();
    this._config = config;
    this.sizingX = "grow";
    this.sizingY = "fixed";
    this.layout = new StackLayout("horizontal", DEFAULTS.buttonRowGap, "start", "stretch");

    for (let i = 0; i < config.buttons.length; i++) {
      const btnConfig = config.buttons[i];
      const btn = new Button();
      btn.sizingX = "grow";
      btn.sizingY = "grow";
      btn.flexGrow = 1;
      btn.text = btnConfig.title.toUpperCase();
      btn.onClick = btnConfig.onClick;
      this._buttons.push(btn);
      this.addChild(btn);
    }
  }

  /** applies theme height and button border styling. */
  public applyTheme(theme: Theme): void {
    this.preferredHeight = theme.buttonHeight;
    for (const btn of this._buttons) {
      btn.borderRadius = theme.borderRadius;
      btn.borderColor = theme.borderInset;
      btn.borderWidth = 1;
    }
  }

  /** the configuration this row was built from. */
  public get config(): GuiButtonRowConfig {
    return this._config;
  }
}
