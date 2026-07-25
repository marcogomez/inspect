import { LabeledControl } from "./labeled-control";
import { StackLayout } from "../core/layouts/stack-layout";
import { DEFAULTS } from "../defaults";
import { Box } from "../widgets/box";
import { Button } from "../widgets/button";

import type { Theme } from "../core/theme";
import type { InspectTheme } from "../themes/inspect-theme";

/** Configuration for a dropdown select control. */
export interface GuiSelectConfig<T> {
  key: string;
  label: string;
  options: Record<string, T>;
  value: () => T;
  onChange: (value: T) => void;
}

/** Dropdown select control that shows options in an overlay list. */
export class GuiSelect<T> extends LabeledControl {
  private readonly _config: GuiSelectConfig<T>;
  private readonly _button: Button;
  private readonly _cachedKeys: string[];
  private readonly _cachedValues: T[];
  private _dropdown: Box | null = null;
  private _backdrop: Box | null = null;
  private _open = false;

  /** caches the option keys and values and builds the button that opens the dropdown. */
  constructor(config: GuiSelectConfig<T>) {
    super();
    this._config = config;
    this.labelText = config.label;

    const keys = Object.keys(config.options);
    this._cachedKeys = keys;
    this._cachedValues = keys.map((k) => config.options[k]);

    this._button = new Button();
    this._button.sizingX = "grow";
    this._button.sizingY = "grow";
    this._button.flexGrow = 1;
    this._button.text = this.findCurrentLabel();
    this._button.onClick = () => this.toggleDropdown();
    this.controlContainer.addChild(this._button);
  }

  /** option key whose value equals the current bound value, or an empty string when none matches. */
  private findCurrentLabel(): string {
    const current = this._config.value();
    for (let i = 0; i < this._cachedValues.length; i++) {
      if (this._cachedValues[i] === current) {
        return this._cachedKeys[i];
      }
    }
    return "";
  }

  /** opens the dropdown when closed, closes it when open. */
  private toggleDropdown(): void {
    if (this._open) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /** walks up to the topmost ancestor, used as the parent for the dropdown and backdrop so they escape any clipping. */
  private getSurfaceRoot(): Box | null {
    let widget = this.parent;
    while (widget && widget.parent) {
      widget = widget.parent;
    }
    return widget as Box | null;
  }

  /** lazily builds the backdrop and the dropdown list of option buttons on first open. */
  private ensureDropdownWidgets(): void {
    if (this._dropdown) {
      return;
    }

    const keys = this._cachedKeys;
    const values = this._cachedValues;

    const backdrop = new Box();
    backdrop.absolute = true;
    backdrop.anchorTop = 0;
    backdrop.anchorLeft = 0;
    backdrop.anchorRight = 0;
    backdrop.anchorBottom = 0;
    backdrop.bgColor = DEFAULTS.backdropColor;
    backdrop.onPointerDown = (): boolean => {
      this.closeDropdown();
      return true;
    };

    const dropdown = new Box();
    dropdown.absolute = true;
    dropdown.sizingX = "fixed";
    dropdown.sizingY = "fixed";
    dropdown.borderWidth = DEFAULTS.selectDropdownBorderWidth;
    dropdown.layout = new StackLayout("vertical", 0, "start", "stretch");

    for (let i = 0; i < keys.length; i++) {
      const label = keys[i];
      const value = values[i];
      const optionBtn = new Button();
      optionBtn.sizingX = "grow";
      optionBtn.sizingY = "fixed";
      optionBtn.text = label;
      optionBtn.onClick = () => {
        this._config.onChange(value);
        this._button.text = label;
        this._button.markDirty();
        this.closeDropdown();
      };
      dropdown.addChild(optionBtn);
    }

    this._backdrop = backdrop;
    this._dropdown = dropdown;
  }

  /** anchors the dropdown below the button, themes it, and attaches it and the backdrop to the root. */
  private openDropdown(): void {
    if (this._open) {
      return;
    }
    this._open = true;

    const root = this.getSurfaceRoot();
    if (!root) {
      return;
    }

    this.ensureDropdownWidgets();
    const dropdown = this._dropdown!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const backdrop = this._backdrop!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

    const theme = this.surface?.getTheme() as InspectTheme | undefined;
    const itemHeight = theme?.controlHeight ?? 24;

    dropdown.anchorLeft = this._button.absoluteX;
    dropdown.anchorTop = this._button.absoluteY + this._button.height;
    dropdown.preferredWidth = this._button.width;
    dropdown.preferredHeight = this._cachedKeys.length * itemHeight;
    dropdown.bgColor = theme?.bgPanelRaised ?? 0x333333ff;
    dropdown.borderColor = theme?.borderPanel ?? 0x555555ff;

    for (let i = 0; i < dropdown.children.length; i++) {
      dropdown.children[i].preferredHeight = itemHeight;
    }

    root.addChild(backdrop);
    root.addChild(dropdown);
    root.needsLayout = true;
  }

  /** removes the dropdown and backdrop from the root. */
  private closeDropdown(): void {
    if (!this._open) {
      return;
    }
    this._open = false;

    const root = this.getSurfaceRoot();
    if (root) {
      if (this._backdrop) {
        root.removeChild(this._backdrop);
      }
      if (this._dropdown) {
        root.removeChild(this._dropdown);
      }
    }
  }

  /** updates the button label to reflect the current bound value. */
  public refresh(): void {
    this._button.text = this.findCurrentLabel();
    this._button.markDirty();
  }

  /** applies theme values to the select button. */
  public override applyTheme(theme: Theme): void {
    super.applyTheme(theme);
    this._button.borderRadius = theme.borderRadius;
    this._button.borderColor = theme.borderInset;
    this._button.borderWidth = 1;
  }

  /** the configuration this control was built from. */
  public get config(): GuiSelectConfig<T> {
    return this._config;
  }
}
