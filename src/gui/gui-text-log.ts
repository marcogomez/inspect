import { StackLayout } from "../core/layouts/stack-layout";
import { Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { Label } from "../widgets/label";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** Configuration for a multi-line read-only text log widget. */
export interface GuiTextLogConfig {
  key: string;
  rows?: number;
  getValue: () => string;
}

/** Multi-line read-only text display, refreshed each frame. */
export class GuiTextLog extends Widget {
  private readonly _config: GuiTextLogConfig;
  private readonly _label: Label;

  /** sizes the log to the requested row count and adds a top-aligned label holding the initial value. */
  constructor(config: GuiTextLogConfig) {
    super();
    this._config = config;

    const rows = config.rows ?? DEFAULTS.textLogDefaultRows;

    this.sizingX = "grow";
    this.sizingY = "fixed";
    this.preferredHeight = rows * DEFAULTS.textLogDefaultLineHeight;
    this.layout = new StackLayout("vertical", 0, "start", "stretch");

    this._label = new Label();
    this._label.sizingX = "grow";
    this._label.sizingY = "grow";
    this._label.flexGrow = 1;
    this._label.vAlign = "top";
    this._label.color = DEFAULTS.textLogLabelColor;
    this._label.text = config.getValue();
    this.addChild(this._label);
  }

  /** paints the inset rounded background behind the log text. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    renderer.fillRoundedRect(0, 0, this.width, this.height, DEFAULTS.textLogBorderRadius, theme.bgPanelInset);
  }

  /** pulls the latest value and redraws when the text changed. */
  public refresh(): void {
    const text = this._config.getValue();
    if (this._label.text === text) {
      return;
    }
    this._label.text = text;
    this.markDirty();
  }

  /** recomputes preferred height from row count and theme metrics. */
  public applyTheme(_theme: Theme): void {
    const rows = this._config.rows ?? DEFAULTS.textLogDefaultRows;
    this.preferredHeight = rows * DEFAULTS.textLogThemeLineHeight + DEFAULTS.textLogThemePadding;
  }

  /** the configuration this log was built from. */
  public get config(): GuiTextLogConfig {
    return this._config;
  }
}
