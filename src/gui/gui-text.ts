import { LabeledControl } from "./labeled-control";
import { DEFAULTS } from "../defaults";
import { TextInput } from "../widgets/text-input";

import type { Theme } from "../core/theme";

/** Configuration for a single-line text input control. */
export interface GuiTextConfig {
  key: string;
  label: string;
  value: () => string;
  onChange: (value: string) => void;
}

/** Single-line text input control with label. */
export class GuiText extends LabeledControl {
  private readonly _input: TextInput;
  private readonly _config: GuiTextConfig;

  /** builds the labeled text input and wires its change callback to the config. */
  constructor(config: GuiTextConfig) {
    super();
    this._config = config;
    this.labelText = config.label;

    this._input = new TextInput();
    this._input.sizingX = "grow";
    this._input.sizingY = "grow";
    this._input.flexGrow = 1;
    this._input.text = config.value();
    this._input.onChange = (text: string) => {
      config.onChange(text);
    };
    this.controlContainer.addChild(this._input);
  }

  /** the configuration this control was built from. */
  public get config(): GuiTextConfig {
    return this._config;
  }

  /** applies base theme spacing then the input's background, text color, and corner radius. */
  public override applyTheme(theme: Theme): void {
    super.applyTheme(theme);
    this._input.bgColor = theme.bgInput;
    this._input.textColor = theme.textValue;
    this._input.borderRadius = DEFAULTS.pointInputBorderRadius;
  }

  /** syncs the input to the bound value, skipping the update while focused so typing is not clobbered. */
  public refresh(): void {
    if (this._input.focused) {
      return;
    }
    const newText = this._config.value();
    if (this._input.text === newText) {
      return;
    }
    this._input.text = newText;
    this._input.cursorPos = newText.length;
    this.markDirty();
  }
}
