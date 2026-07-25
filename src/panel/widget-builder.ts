import { Widget } from "../core/widget";
import { GuiButton } from "../gui/gui-button";
import { GuiButtonRow } from "../gui/gui-button-row";
import { GuiColor } from "../gui/gui-color";
import { GuiFolder } from "../gui/gui-folder";
import { GuiMonitor } from "../gui/gui-monitor";
import { GuiReorderList } from "../gui/gui-reorder-list";
import { GuiSelect } from "../gui/gui-select";
import { GuiSeparator } from "../gui/gui-separator";
import { GuiSlider } from "../gui/gui-slider";
import { GuiText } from "../gui/gui-text";
import { GuiTextLog } from "../gui/gui-text-log";
import { GuiToggle } from "../gui/gui-toggle";

import type { InspectTheme } from "../themes/inspect-theme";
import type {
  ButtonConfig,
  ButtonRowConfig,
  ColorConfig,
  ControlConfig,
  CustomControlBuilder,
  FolderConfig,
  MonitorConfig,
  Point2DConfig,
  Point3DConfig,
  ReorderListConfig,
  SelectConfig,
  SliderConfig,
  TextConfig,
  TextLogConfig,
  ToggleConfig
} from "../types";

/** a monitor widget paired with the config it was built from, for refresh and state access. */
interface MonitorEntry {
  widget: GuiMonitor;
  config: MonitorConfig;
}

/** a text log widget paired with the config it was built from, for refresh. */
interface TextLogEntry {
  widget: GuiTextLog;
  config: TextLogConfig;
}

/**
 * Factory that constructs themed GUI widgets from declarative control configs.
 * Tracks monitors, text logs, custom controls, and folders for refresh and state export.
 */
export class WidgetBuilder {
  /** theme applied to every widget this builder creates. */
  public readonly theme: InspectTheme;
  /** monitor entries keyed by control key. */
  public readonly monitors: Map<string, MonitorEntry> = new Map();
  /** text log entries keyed by control key. */
  public readonly textLogs: Map<string, TextLogEntry> = new Map();
  /** APIs returned by custom control builders, keyed by control key. */
  public readonly customControls: Map<string, unknown> = new Map();
  /** folders keyed by id, used for state export and refresh traversal. */
  public readonly folders: Map<string, GuiFolder> = new Map();
  /** reorder lists keyed by control key. */
  public readonly reorderLists: Map<string, GuiReorderList> = new Map();

  private _monitorList: MonitorEntry[] = [];
  private _textLogList: TextLogEntry[] = [];

  /** stores the theme applied to widgets built by this instance. */
  constructor(theme: InspectTheme) {
    this.theme = theme;
  }

  /** builds a themed folder widget and registers it by id. */
  public buildFolder(config: FolderConfig): GuiFolder {
    const folder = new GuiFolder();
    folder.id = config.id;
    folder.title = config.title;
    folder.expanded = config.expanded ?? false;
    folder.applyTheme(this.theme);
    this.folders.set(config.id, folder);
    return folder;
  }

  /** builds each control config and adds the resulting widgets to the folder. */
  public buildControls(
    folder: GuiFolder,
    controls: ControlConfig[],
    customBuilders?: Record<string, CustomControlBuilder>
  ): void {
    for (let i = 0; i < controls.length; i++) {
      const widget = this.buildControl(folder, controls[i], customBuilders);
      if (widget) {
        folder.addControl(widget);
      }
    }
  }

  /** builds a single control by type, falling back to custom builders for unknown types. */
  public buildControl(
    folder: GuiFolder,
    control: ControlConfig,
    customBuilders?: Record<string, CustomControlBuilder>
  ): Widget | null {
    switch (control.type) {
      case "slider":
        return this.buildSlider(control.config);
      case "toggle":
        return this.buildToggle(control.config);
      case "select":
        return this.buildSelect(control.config);
      case "button":
        return this.buildButton(control.config);
      case "monitor":
        return this.buildMonitor(control.config);
      case "color":
        return this.buildColor(control.config);
      case "text":
        return this.buildText(control.config);
      case "point2d":
        return this.buildPoint2D(control.config);
      case "point3d":
        return this.buildPoint3D(control.config);
      case "separator":
        return this.buildSeparator();
      case "buttonRow":
        return this.buildButtonRow(control.config);
      case "subfolder":
        return this.buildSubfolder(
          control.config.title,
          control.config.expanded,
          control.config.controls,
          customBuilders
        );
      case "reorderList":
        return this.buildReorderList(control.config);
      case "textLog":
        return this.buildTextLog(control.config);
      default: {
        const unknownControl = control as unknown as { type: string; config: Record<string, unknown> };
        if (customBuilders) {
          const builder = customBuilders[unknownControl.type];
          if (builder) {
            const api = builder(folder, unknownControl.config);
            const key = unknownControl.config.key as string | undefined;
            if (api && key) {
              this.customControls.set(key, api);
            }
            if (api instanceof Widget) {
              return api as Widget;
            }
          }
        }
        return null;
      }
    }
  }

  /** builds a themed slider control from a slider config. */
  private buildSlider(config: SliderConfig): Widget {
    const widget = new GuiSlider({
      key: config.key,
      label: config.label ?? config.key,
      min: config.min,
      max: config.max,
      step: config.step ?? 0,
      value: config.value,
      onChange: config.onChange,
      applyOnRelease: config.applyOnRelease
    });
    widget.applyTheme(this.theme);
    return widget;
  }

  /** builds a themed toggle control from a toggle config. */
  private buildToggle(config: ToggleConfig): Widget {
    const widget = new GuiToggle({
      key: config.key,
      label: config.label ?? config.key,
      value: config.value,
      onChange: config.onChange
    });
    widget.applyTheme(this.theme);
    return widget;
  }

  /** builds a themed dropdown select control from a select config. */
  private buildSelect(config: SelectConfig): Widget {
    const widget = new GuiSelect({
      key: config.key,
      label: config.label ?? config.key,
      options: config.options,
      value: config.value,
      onChange: config.onChange
    });
    widget.applyTheme(this.theme);
    return widget;
  }

  /** builds a themed action button from a button config. */
  private buildButton(config: ButtonConfig): Widget {
    const widget = new GuiButton(config.title, config.onClick);
    widget.applyTheme(this.theme);
    return widget;
  }

  /** builds a monitor control, primes it with a first sample, and registers it for later refresh. */
  private buildMonitor(config: MonitorConfig): Widget {
    const widget = new GuiMonitor({
      key: config.key,
      label: config.label ?? config.key,
      value: config.value,
      format: config.format,
      graph: config.view === "graph",
      interval: config.interval,
      min: config.min,
      max: config.max
    });
    widget.applyTheme(this.theme);
    widget.refresh();
    const entry = { widget, config };
    this.monitors.set(config.key, entry);
    this._monitorList.push(entry);
    return widget;
  }

  /** builds a themed color picker control from a color config. */
  private buildColor(config: ColorConfig): Widget {
    const widget = new GuiColor({
      key: config.key,
      label: config.label ?? config.key,
      value: config.value as () => { r: number; g: number; b: number } | string,
      onChange: config.onChange as (color: { r: number; g: number; b: number } | string) => void,
      mode: config.colorType ?? "float",
      alpha: config.alpha,
      displayFormat: config.displayFormat
    });
    widget.applyTheme(this.theme);
    return widget;
  }

  /** builds a themed text input control from a text config. */
  private buildText(config: TextConfig): Widget {
    const widget = new GuiText({
      key: config.key,
      label: config.label ?? config.key,
      value: config.value,
      onChange: config.onChange
    });
    widget.applyTheme(this.theme);
    return widget;
  }

  /** builds a 2D point editor as a folder of x and y sliders that read and write the shared point value. */
  private buildPoint2D(config: Point2DConfig): Widget {
    const container = new GuiFolder();
    container.id = config.key;
    container.title = config.label ?? config.key;
    container.expanded = true;
    container.applyTheme(this.theme);

    const xSlider = new GuiSlider({
      key: config.key + ".x",
      label: "x",
      min: config.x?.min ?? -100,
      max: config.x?.max ?? 100,
      step: config.x?.step ?? 0.01,
      value: () => config.value().x,
      onChange: (v: number) => {
        const cur = config.value();
        config.onChange({ x: v, y: cur.y });
      }
    });
    xSlider.applyTheme(this.theme);
    container.addControl(xSlider);

    const ySlider = new GuiSlider({
      key: config.key + ".y",
      label: "y",
      min: config.y?.min ?? -100,
      max: config.y?.max ?? 100,
      step: config.y?.step ?? 0.01,
      value: () => config.value().y,
      onChange: (v: number) => {
        const cur = config.value();
        config.onChange({ x: cur.x, y: v });
      }
    });
    ySlider.applyTheme(this.theme);
    container.addControl(ySlider);

    return container;
  }

  /** builds a 3D point editor as a folder of x, y, and z sliders that read and write the shared point value. */
  private buildPoint3D(config: Point3DConfig): Widget {
    const container = new GuiFolder();
    container.id = config.key;
    container.title = config.label ?? config.key;
    container.expanded = true;
    container.applyTheme(this.theme);

    const axes: Array<{ name: string; getter: () => number; setter: (v: number) => void }> = [
      {
        name: "x",
        getter: () => config.value().x,
        setter: (v) => {
          const c = config.value();
          config.onChange({ x: v, y: c.y, z: c.z });
        }
      },
      {
        name: "y",
        getter: () => config.value().y,
        setter: (v) => {
          const c = config.value();
          config.onChange({ x: c.x, y: v, z: c.z });
        }
      },
      {
        name: "z",
        getter: () => config.value().z,
        setter: (v) => {
          const c = config.value();
          config.onChange({ x: c.x, y: c.y, z: v });
        }
      }
    ];

    for (const axis of axes) {
      const s = new GuiSlider({
        key: config.key + "." + axis.name,
        label: axis.name,
        min: -100,
        max: 100,
        step: 0.01,
        value: axis.getter,
        onChange: axis.setter
      });
      s.applyTheme(this.theme);
      container.addControl(s);
    }

    return container;
  }

  /** builds a themed divider control. */
  private buildSeparator(): Widget {
    const widget = new GuiSeparator();
    widget.applyTheme(this.theme);
    return widget;
  }

  /** builds a themed row of action buttons from a button-row config. */
  private buildButtonRow(config: ButtonRowConfig): Widget {
    const widget = new GuiButtonRow(config);
    widget.applyTheme(this.theme);
    return widget;
  }

  /** builds a nested folder and recursively builds its child controls into it. */
  private buildSubfolder(
    title: string,
    expanded: boolean | undefined,
    controls: ControlConfig[],
    customBuilders?: Record<string, CustomControlBuilder>
  ): Widget {
    const subFolder = new GuiFolder();
    subFolder.id = title;
    subFolder.title = title;
    subFolder.expanded = expanded ?? false;
    subFolder.applyTheme(this.theme);
    this.buildControls(subFolder, controls, customBuilders);
    return subFolder;
  }

  /** builds a reorder list control and registers it by key. */
  private buildReorderList(config: ReorderListConfig): Widget {
    const widget = new GuiReorderList(config);
    widget.applyTheme(this.theme);
    this.reorderLists.set(config.key, widget);
    return widget;
  }

  /** builds a text log control and registers it for later refresh. */
  private buildTextLog(config: TextLogConfig): Widget {
    const widget = new GuiTextLog(config);
    widget.applyTheme(this.theme);
    const entry = { widget, config };
    this.textLogs.set(config.key, entry);
    this._textLogList.push(entry);
    return widget;
  }

  /** refreshes every visible monitor widget. */
  public refreshMonitors(): void {
    const list = this._monitorList;
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (entry.widget.isEffectivelyVisible()) {
        entry.widget.refresh();
      }
    }
  }

  /** refreshes every visible text log widget. */
  public refreshTextLogs(): void {
    const list = this._textLogList;
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (entry.widget.isEffectivelyVisible()) {
        entry.widget.refresh();
      }
    }
  }

  /** clears all tracked monitors, text logs, custom controls, folders, and lists. */
  public clear(): void {
    this.monitors.clear();
    this.textLogs.clear();
    this.customControls.clear();
    this.folders.clear();
    this.reorderLists.clear();
    this._monitorList.length = 0;
    this._textLogList.length = 0;
  }
}
