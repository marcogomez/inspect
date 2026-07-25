import { LabeledControl } from "./labeled-control";
import { StackLayout } from "../core/layouts/stack-layout";
import { THEME_DEFAULT } from "../core/widget";
import { DEFAULTS } from "../defaults";
import { Box } from "../widgets/box";
import { Label } from "../widgets/label";
import { TextInput } from "../widgets/text-input";

import type { Theme } from "../core/theme";

/** Per-axis numeric constraints for a point control. */
export interface AxisConfig {
  min?: number;
  max?: number;
  step?: number;
}

/** Configuration for a 3D point editor control. */
export interface GuiPoint3dConfig {
  key: string;
  label: string;
  value: () => { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
  x?: AxisConfig;
  y?: AxisConfig;
  z?: AxisConfig;
}

/** Three-axis numeric input for editing a 3D point. */
export class GuiPoint3d extends LabeledControl {
  private readonly _config: GuiPoint3dConfig;
  private readonly _inputX: TextInput;
  private readonly _inputY: TextInput;
  private readonly _inputZ: TextInput;

  /** builds X, Y, and Z labeled inputs side by side, each wired to update its axis. */
  constructor(config: GuiPoint3dConfig) {
    super();
    this._config = config;
    this.labelText = config.label;

    this.controlContainer.layout = new StackLayout("horizontal", DEFAULTS.pointAxisGap, "start", "stretch");

    const initial = config.value();

    const xContainer = new Box();
    xContainer.sizingX = "grow";
    xContainer.sizingY = "grow";
    xContainer.flexGrow = 1;
    xContainer.layout = new StackLayout("horizontal", DEFAULTS.pointAxisGap, "start", "stretch");

    const xLabel = new Label();
    xLabel.text = "X";
    xLabel.sizingX = "fit";
    xLabel.sizingY = "grow";
    xLabel.vAlign = "middle";
    xLabel.color = THEME_DEFAULT;
    xContainer.addChild(xLabel);

    this._inputX = new TextInput();
    this._inputX.sizingX = "grow";
    this._inputX.sizingY = "grow";
    this._inputX.flexGrow = 1;
    this._inputX.text = String(initial.x);
    this._inputX.onChange = (text: string) => this.handleChange("x", text);
    xContainer.addChild(this._inputX);

    const yContainer = new Box();
    yContainer.sizingX = "grow";
    yContainer.sizingY = "grow";
    yContainer.flexGrow = 1;
    yContainer.layout = new StackLayout("horizontal", DEFAULTS.pointAxisGap, "start", "stretch");

    const yLabel = new Label();
    yLabel.text = "Y";
    yLabel.sizingX = "fit";
    yLabel.sizingY = "grow";
    yLabel.vAlign = "middle";
    yLabel.color = THEME_DEFAULT;
    yContainer.addChild(yLabel);

    this._inputY = new TextInput();
    this._inputY.sizingX = "grow";
    this._inputY.sizingY = "grow";
    this._inputY.flexGrow = 1;
    this._inputY.text = String(initial.y);
    this._inputY.onChange = (text: string) => this.handleChange("y", text);
    yContainer.addChild(this._inputY);

    const zContainer = new Box();
    zContainer.sizingX = "grow";
    zContainer.sizingY = "grow";
    zContainer.flexGrow = 1;
    zContainer.layout = new StackLayout("horizontal", DEFAULTS.pointAxisGap, "start", "stretch");

    const zLabel = new Label();
    zLabel.text = "Z";
    zLabel.sizingX = "fit";
    zLabel.sizingY = "grow";
    zLabel.vAlign = "middle";
    zLabel.color = THEME_DEFAULT;
    zContainer.addChild(zLabel);

    this._inputZ = new TextInput();
    this._inputZ.sizingX = "grow";
    this._inputZ.sizingY = "grow";
    this._inputZ.flexGrow = 1;
    this._inputZ.text = String(initial.z);
    this._inputZ.onChange = (text: string) => this.handleChange("z", text);
    zContainer.addChild(this._inputZ);

    this.controlContainer.addChild(xContainer);
    this.controlContainer.addChild(yContainer);
    this.controlContainer.addChild(zContainer);
  }

  /** parses the edited axis, clamps to its constraints, and emits the combined point; ignores non-numeric input. */
  private handleChange(axis: "x" | "y" | "z", text: string): void {
    const parsed = parseFloat(text);
    if (isNaN(parsed)) {
      return;
    }

    const current = this._config.value();
    let x = current.x;
    let y = current.y;
    let z = current.z;

    if (axis === "x") {
      x = this.clampAxis(parsed, this._config.x);
    } else if (axis === "y") {
      y = this.clampAxis(parsed, this._config.y);
    } else {
      z = this.clampAxis(parsed, this._config.z);
    }

    this._config.onChange({ x, y, z });
  }

  /** clamps a value to the axis's optional min and max, returning it unchanged when no constraints are set. */
  private clampAxis(value: number, axisConfig?: AxisConfig): number {
    if (!axisConfig) {
      return value;
    }
    let v = value;
    if (axisConfig.min !== undefined) {
      v = Math.max(axisConfig.min, v);
    }
    if (axisConfig.max !== undefined) {
      v = Math.min(axisConfig.max, v);
    }
    return v;
  }

  private _lastX = NaN;
  private _lastY = NaN;
  private _lastZ = NaN;

  /** syncs the three axis inputs from the current value if any axis changed. */
  public refresh(): void {
    const val = this._config.value();
    if (val.x !== this._lastX) {
      this._lastX = val.x;
      this._inputX.text = String(val.x);
      this._inputX.cursorPos = this._inputX.text.length;
      this._inputX.markDirty();
    }
    if (val.y !== this._lastY) {
      this._lastY = val.y;
      this._inputY.text = String(val.y);
      this._inputY.cursorPos = this._inputY.text.length;
      this._inputY.markDirty();
    }
    if (val.z !== this._lastZ) {
      this._lastZ = val.z;
      this._inputZ.text = String(val.z);
      this._inputZ.cursorPos = this._inputZ.text.length;
      this._inputZ.markDirty();
    }
  }

  /** applies theme colors and border radius to the axis inputs. */
  public override applyTheme(theme: Theme): void {
    super.applyTheme(theme);
    this._inputX.textColor = theme.textValue;
    this._inputX.borderRadius = DEFAULTS.pointInputBorderRadius;
    this._inputY.textColor = theme.textValue;
    this._inputY.borderRadius = DEFAULTS.pointInputBorderRadius;
    this._inputZ.textColor = theme.textValue;
    this._inputZ.borderRadius = DEFAULTS.pointInputBorderRadius;
  }

  /** returns the control's configuration. */
  public get config(): GuiPoint3dConfig {
    return this._config;
  }
}
