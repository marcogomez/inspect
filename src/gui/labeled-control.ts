import { StackLayout } from "../core/layouts/stack-layout";
import { THEME_DEFAULT, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { Box } from "../widgets/box";
import { Label } from "../widgets/label";

import type { Theme } from "../core/theme";
import type { InspectTheme } from "../themes/inspect-theme";

const VALUE_COLUMN_WIDTH = DEFAULTS.valueColumnWidth;

/**
 * Base class for controls that display a label on the left and a value/input
 * region on the right, using a fixed-width value column.
 */
export class LabeledControl extends Widget {
  private readonly _label: Label;
  private readonly _controlContainer: Box;

  /** builds the ellipsized label and a fixed-width value column that subclasses fill with their control. */
  constructor() {
    super();
    this.sizingX = "grow";
    this.sizingY = "fixed";
    this.layout = new StackLayout("horizontal", DEFAULTS.labeledControlGap, "start", "stretch");

    this._label = new Label();
    this._label.sizingX = "grow";
    this._label.sizingY = "grow";
    this._label.flexGrow = 1;
    this._label.overflow = "ellipsis";
    this._label.vAlign = "middle";
    this._label.color = THEME_DEFAULT;
    this.addChild(this._label);

    this._controlContainer = new Box();
    this._controlContainer.sizingX = "fixed";
    this._controlContainer.preferredWidth = VALUE_COLUMN_WIDTH;
    this._controlContainer.sizingY = "grow";
    this._controlContainer.flexShrink = 0;
    this._controlContainer.layout = new StackLayout("horizontal", DEFAULTS.controlInnerGap, "start", "stretch");
    this.addChild(this._controlContainer);
  }

  /** the fixed-width right-hand column that subclasses add their control widgets to. */
  public get controlContainer(): Box {
    return this._controlContainer;
  }

  /** sets the label text and marks the control for repaint. */
  public set labelText(value: string) {
    this._label.text = value;
    this.markDirty();
  }

  /** the current label text. */
  public get labelText(): string {
    return this._label.text;
  }

  /** applies theme height, label offset, and label color. */
  public applyTheme(theme: Theme): void {
    const t = theme as InspectTheme;
    this.preferredHeight = t.controlHeight;
    this._label.textOffsetY = t.textOffsetY ?? 0;
    if (t.textLabel) {
      this._label.color = t.textLabel;
    }
  }
}
