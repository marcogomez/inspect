import { LabeledControl } from "./labeled-control";
import { StackLayout } from "../core/layouts/stack-layout";
import { DEFAULTS } from "../defaults";
import { NumberInput } from "../widgets/number-input";
import { Slider } from "../widgets/slider";

import type { Theme } from "../core/theme";
import type { InspectTheme } from "../themes/inspect-theme";

/** Configuration for a numeric slider control. */
export interface GuiSliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: () => number;
  onChange: (value: number) => void;
  applyOnRelease?: boolean;
}

/** Slider with adjacent numeric input, supporting step-snapping and optional deferred commit. */
export class GuiSlider extends LabeledControl {
  private readonly _slider: Slider;
  private readonly _valueInput: NumberInput;
  private readonly _config: GuiSliderConfig;
  private _pendingValue: number;

  /**
   * Builds a slider paired with a numeric input over the same value. Both push
   * changes to each other and either commit immediately or defer to release when
   * applyOnRelease is set. Display precision is derived from the step size.
   */
  constructor(config: GuiSliderConfig) {
    super();
    this._config = config;
    // decimal digits needed to represent the step without truncation
    const decimals = config.step >= 1 ? 0 : Math.max(0, Math.ceil(-Math.log10(config.step)));
    this.labelText = config.label;
    this._pendingValue = config.value();

    this.controlContainer.layout = new StackLayout("horizontal", DEFAULTS.controlInnerGap, "start", "stretch");

    this._slider = new Slider();
    this._slider.sizingX = "grow";
    this._slider.sizingY = "grow";
    this._slider.flexGrow = 2;
    this._slider.min = config.min;
    this._slider.max = config.max;
    this._slider.value = config.value();
    this._slider.onChange = (raw: number) => {
      const snapped = this.snap(raw);
      this._slider.value = snapped;
      this._pendingValue = snapped;
      this._valueInput.numValue = snapped;
      this._valueInput.markDirty();
      if (!config.applyOnRelease) {
        config.onChange(snapped);
      }
    };
    if (config.applyOnRelease) {
      this._slider.onRelease = () => {
        config.onChange(this._pendingValue);
      };
    }
    this.controlContainer.addChild(this._slider);

    this._valueInput = new NumberInput();
    this._valueInput.sizingX = "grow";
    this._valueInput.sizingY = "grow";
    this._valueInput.flexGrow = 1;
    this._valueInput.numValue = config.value();
    this._valueInput.min = config.min;
    this._valueInput.max = config.max;
    this._valueInput.step = config.step;
    this._valueInput.decimals = decimals;
    this._valueInput.updatePointerScale();

    this._valueInput.onChange = (value: number) => {
      this._slider.value = value;
      this._slider.markDirty();
      this._pendingValue = value;
      if (!config.applyOnRelease) {
        config.onChange(value);
      }
    };
    this._valueInput.onCommit = (value: number) => {
      if (config.applyOnRelease) {
        config.onChange(value);
      }
    };

    this.controlContainer.addChild(this._valueInput);
  }

  /** the configuration this control was built from. */
  public get config(): GuiSliderConfig {
    return this._config;
  }

  /** applies theme values to the slider and numeric input. */
  public override applyTheme(theme: Theme): void {
    super.applyTheme(theme);
    const t = theme as InspectTheme;
    this._valueInput.textColor = theme.textValue;
    this._slider.fillColor = t.bgAccent;
  }

  /** syncs the slider and input to the current bound value if it changed. */
  public refresh(): void {
    const current = this._config.value();
    const snapped = this.snap(current);
    if (snapped === this._slider.value) {
      return;
    }
    this._slider.value = snapped;
    this._pendingValue = snapped;
    this._valueInput.numValue = snapped;
    this.markDirty();
  }

  /** rounds a value to the nearest multiple of the step, or returns it unchanged when step is not positive. */
  private snap(raw: number): number {
    const step = this._config.step;
    if (step <= 0) {
      return raw;
    }
    return Math.round(raw / step) * step;
  }
}
