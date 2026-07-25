import { LabeledControl } from "./labeled-control";
import { THEME_DEFAULT, Widget } from "../core/widget";
import { DEFAULTS } from "../defaults";

import type { Renderer } from "../core/renderer";
import type { Theme } from "../core/theme";

/** Configuration for a boolean toggle control. */
export interface GuiToggleConfig {
  key: string;
  label: string;
  value: () => boolean;
  onChange: (value: boolean) => void;
}

/** Square checkbox that toggles on click or Space/Enter and reports changes through onChange. */
class Checkbox extends Widget {
  /** current checked state. */
  public checked = false;
  /** border color override; uses the default checkbox border when THEME_DEFAULT. */
  public boxColor: number = THEME_DEFAULT;
  /** check-mark color override; uses the primary text color when THEME_DEFAULT. */
  public checkColor: number = THEME_DEFAULT;
  /** called with the new state whenever the checkbox toggles. */
  public onChange: ((value: boolean) => void) | null = null;

  /** builds a fixed-size, focusable checkbox. */
  constructor() {
    super();
    this.sizingX = "fixed";
    this.sizingY = "fixed";
    this.preferredWidth = DEFAULTS.checkboxSize;
    this.preferredHeight = DEFAULTS.checkboxSize;
    this.focusable = true;
  }

  /** paints the rounded box and, when checked, a two-stroke check mark. */
  protected override drawSelf(renderer: Renderer, theme: Theme): void {
    const w = this.width;
    const h = this.height;
    const r = Math.min(DEFAULTS.checkboxBorderRadius, w / 4);
    const borderColor = this.boxColor === THEME_DEFAULT ? DEFAULTS.checkboxDefaultBorderColor : this.boxColor;

    renderer.fillRoundedRect(0, 0, w, h, r, theme.bgInput);
    renderer.strokeRoundedRect(0, 0, w, h, r, borderColor, 1);

    if (this.checked) {
      // check mark drawn as two strokes in normalized box coords (0..1)
      const checkColor = this.checkColor === THEME_DEFAULT ? theme.textPrimary : this.checkColor;
      renderer.pushAlpha(0.9);
      renderer.drawLine(
        (w * 0.2) | 0,
        (h * 0.5) | 0,
        (w * 0.42) | 0,
        (h * 0.72) | 0,
        checkColor,
        DEFAULTS.checkboxCheckLineWidth
      );
      renderer.drawLine(
        (w * 0.42) | 0,
        (h * 0.72) | 0,
        (w * 0.8) | 0,
        (h * 0.28) | 0,
        checkColor,
        DEFAULTS.checkboxCheckLineWidth
      );
      renderer.popAlpha();
    }
  }

  /** toggles the checked state on press and reports the change. */
  public override onPointerDown(_pointerId: number, _x: number, _y: number, _button: number): boolean {
    this.checked = !this.checked;
    if (this.onChange) {
      this.onChange(this.checked);
    }
    this.markDirty();
    return true;
  }

  /** toggles the checked state on Space or Enter. */
  public override onKeyDown(key: string, code: string, ctrl: boolean, shift: boolean, alt: boolean): boolean {
    if (code === "Space" || code === "Enter") {
      this.checked = !this.checked;
      if (this.onChange) {
        this.onChange(this.checked);
      }
      this.markDirty();
      return true;
    }
    return super.onKeyDown(key, code, ctrl, shift, alt);
  }
}

/** Boolean toggle control displayed as a labeled checkbox. */
export class GuiToggle extends LabeledControl {
  private readonly _checkbox: Checkbox;
  private readonly _config: GuiToggleConfig;

  /** builds the labeled checkbox and wires its change callback to the config. */
  constructor(config: GuiToggleConfig) {
    super();
    this._config = config;
    this.labelText = config.label;

    this._checkbox = new Checkbox();
    this._checkbox.checked = config.value();
    this._checkbox.alignSelf = "center";
    this._checkbox.onChange = (value: boolean) => {
      config.onChange(value);
    };
    this.controlContainer.addChild(this._checkbox);
  }

  /** the configuration this control was built from. */
  public get config(): GuiToggleConfig {
    return this._config;
  }

  /** re-reads the bound value and updates the checkbox state. */
  public refresh(): void {
    const val = this._config.value();
    if (this._checkbox.checked === val) {
      return;
    }
    this._checkbox.checked = val;
    this.markDirty();
  }
}
