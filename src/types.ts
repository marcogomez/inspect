import type { InspectTheme } from "./themes/inspect-theme";

/** Configuration for a numeric slider control. */
export interface SliderConfig {
  key: string;
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: () => number;
  onChange: (value: number) => void;
  applyOnRelease?: boolean;
}

/** Configuration for a boolean toggle control. */
export interface ToggleConfig {
  key: string;
  label?: string;
  value: () => boolean;
  onChange: (value: boolean) => void;
}

/** Configuration for a dropdown select control. */
export interface SelectConfig<T = string | number> {
  key: string;
  label?: string;
  options: Record<string, T>;
  value: () => T;
  onChange: (value: T) => void;
}

/** Configuration for a clickable button control. */
export interface ButtonConfig {
  key: string;
  title: string;
  onClick: () => void;
}

/** Configuration for a read-only monitor display (text or graph). */
export interface MonitorConfig {
  key: string;
  label?: string;
  value: () => string | number;
  interval?: number;
  format?: (v: number) => string;
  view?: "graph";
  min?: number;
  max?: number;
  rows?: number;
}

/** Supported display representations for color values. */
export type ColorDisplayFormat = "hex" | "hexAlpha" | "floatRgb" | "floatRgba" | "intRgb" | "intRgba";

/** Configuration for a color picker control. */
export interface ColorConfig {
  key: string;
  label?: string;
  value: () => string | { r: number; g: number; b: number };
  onChange: (value: string | { r: number; g: number; b: number }) => void;
  alpha?: boolean;
  colorType?: "float" | "int";
  displayFormat?: ColorDisplayFormat;
}

/** Configuration for a text input control. */
export interface TextConfig {
  key: string;
  label?: string;
  value: () => string;
  onChange: (value: string) => void;
}

/** Configuration for a 2D point editor (x, y). */
export interface Point2DConfig {
  key: string;
  label?: string;
  value: () => { x: number; y: number };
  onChange: (value: { x: number; y: number }) => void;
  x?: { min?: number; max?: number; step?: number };
  y?: { min?: number; max?: number; step?: number };
}

/** Configuration for a 3D point editor (x, y, z). */
export interface Point3DConfig {
  key: string;
  label?: string;
  value: () => { x: number; y: number; z: number };
  onChange: (value: { x: number; y: number; z: number }) => void;
}

/** Configuration for a visual separator line. */
export interface SeparatorConfig {
  key: string;
}

/** Configuration for an editable interaction matrix grid. */
export interface MatrixGridConfig {
  key: string;
  label?: string;
  nTypes: number;
  matrix: Float32Array;
  maxTypes: number;
  palette: Float32Array;
  onChange: (row: number, col: number, value: number) => void;
  minValue?: number;
  maxValue?: number;
  tooltip?: (row: number, col: number, value: number) => string;
}

/** Configuration for a row of buttons sharing one line. */
export interface ButtonRowConfig {
  key: string;
  buttons: { title: string; onClick: () => void }[];
}

/** Configuration for a collapsible subfolder of controls. */
export interface SubfolderConfig {
  key: string;
  title: string;
  expanded?: boolean;
  controls: ControlConfig[];
}

/** Configuration for a drag-to-reorder list widget. */
export interface ReorderListConfig {
  key: string;
  items: { id: string; label: string }[];
  onChange: (newOrder: string[]) => void;
}

/** Configuration for a scrollable text log display. */
export interface TextLogConfig {
  key: string;
  rows?: number;
  getValue: () => string;
}

/** Discriminated union of all control configurations. */
export type ControlConfig =
  | { type: "slider"; config: SliderConfig }
  | { type: "toggle"; config: ToggleConfig }
  | { type: "select"; config: SelectConfig }
  | { type: "button"; config: ButtonConfig }
  | { type: "monitor"; config: MonitorConfig }
  | { type: "color"; config: ColorConfig }
  | { type: "text"; config: TextConfig }
  | { type: "point2d"; config: Point2DConfig }
  | { type: "point3d"; config: Point3DConfig }
  | { type: "separator"; config: SeparatorConfig }
  | { type: "matrixGrid"; config: MatrixGridConfig }
  | { type: "buttonRow"; config: ButtonRowConfig }
  | { type: "subfolder"; config: SubfolderConfig }
  | { type: "reorderList"; config: ReorderListConfig }
  | { type: "textLog"; config: TextLogConfig };

/** Top-level folder containing a set of controls. */
export interface FolderConfig {
  id: string;
  title: string;
  expanded?: boolean;
  parent?: string;
  controls: ControlConfig[];
}

/** Configuration for a single tab page containing folders. */
export interface TabPageConfig {
  title: string;
  folders: FolderConfig[];
  showImportExport?: boolean;
}

/** Callback signature for registering a custom control builder. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomControlBuilder = (folder: any, config: Record<string, any>) => any;

/** Mount options common to the panel, independent of theme and font settings. */
export interface BaseMountOptions {
  position?: "left" | "right";
  width?: number;
  toggleKey?: string;
  persistVisibility?: boolean;
  storageKey?: string;
  initiallyVisible?: boolean;
  showImportExport?: boolean;
  showToggleButton?: boolean;
  toggleButtonSize?: number;
  tabBarReservedEdge?: number;
  borderRadius?: number;
  margin?: number;
  debugMode?: boolean;
  customPlugins?: unknown[];
  customControlBuilders?: Record<string, CustomControlBuilder>;
}

/** Create a slider control config. */
export function slider(config: SliderConfig): ControlConfig {
  return { type: "slider", config };
}
/** Create a toggle control config. */
export function toggle(config: ToggleConfig): ControlConfig {
  return { type: "toggle", config };
}
/** Create a select control config. */
export function select<T = string | number>(config: SelectConfig<T>): ControlConfig {
  return { type: "select", config: config as unknown as SelectConfig };
}
/** Create a button control config. */
export function button(config: ButtonConfig): ControlConfig {
  return { type: "button", config };
}
/** Create a monitor control config. */
export function monitor(config: MonitorConfig): ControlConfig {
  return { type: "monitor", config };
}
/** Create a color picker control config. */
export function color(config: ColorConfig): ControlConfig {
  return { type: "color", config };
}
/** Create a text input control config. */
export function text(config: TextConfig): ControlConfig {
  return { type: "text", config };
}
/** Create a 2D point editor control config. */
export function point2d(config: Point2DConfig): ControlConfig {
  return { type: "point2d", config };
}
/** Create a 3D point editor control config. */
export function point3d(config: Point3DConfig): ControlConfig {
  return { type: "point3d", config };
}
/** Create a separator control config. */
export function separator(key: string): ControlConfig {
  return { type: "separator", config: { key } };
}
/** Create a matrix grid control config. */
export function matrixGrid(config: MatrixGridConfig): ControlConfig {
  return { type: "matrixGrid", config };
}
/** Create a button row control config. */
export function buttonRow(config: ButtonRowConfig): ControlConfig {
  return { type: "buttonRow", config };
}
/** Create a subfolder control config. */
export function subfolder(config: SubfolderConfig): ControlConfig {
  return { type: "subfolder", config };
}
/** Create a reorder list control config. */
export function reorderList(config: ReorderListConfig): ControlConfig {
  return { type: "reorderList", config };
}
/** Create a text log control config. */
export function textLog(config: TextLogConfig): ControlConfig {
  return { type: "textLog", config };
}
/** Create a custom control config with an arbitrary type string. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function customControl(type: string, config: Record<string, any>): ControlConfig {
  return { type, config } as unknown as ControlConfig;
}

/** Extract keys of T whose values extend V. */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T] &
  string;

/** Convert a camelCase key into a lower-cased, space-separated label. */
function camelToLabel(key: string): string {
  // insert a space at each camelCase boundary, then lowercase
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

// eslint-disable-next-line no-redeclare, @typescript-eslint/no-namespace
export namespace slider {
  /** Bind a slider to a numeric property of the target object. */
  export function of<T>(
    target: T,
    key: KeysOfType<T, number>,
    opts: {
      min: number;
      max: number;
      step?: number;
      label?: string;
      applyOnRelease?: boolean;
    },
    onChange?: () => void
  ): ControlConfig {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = target as any;
    return {
      type: "slider",
      config: {
        key,
        label: opts.label ?? camelToLabel(key),
        min: opts.min,
        max: opts.max,
        step: opts.step,
        applyOnRelease: opts.applyOnRelease,
        value: () => obj[key],
        onChange: (v: number) => {
          obj[key] = v;
          onChange?.();
        }
      }
    };
  }
}

// eslint-disable-next-line no-redeclare, @typescript-eslint/no-namespace
export namespace toggle {
  /** Bind a toggle to a boolean property of the target object. */
  export function of<T>(
    target: T,
    key: KeysOfType<T, boolean>,
    optsOrOnChange?: { label?: string } | (() => void),
    onChange?: () => void
  ): ControlConfig {
    const isCallback = typeof optsOrOnChange === "function";
    const opts = isCallback ? undefined : optsOrOnChange;
    const cb = isCallback ? optsOrOnChange : onChange;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = target as any;
    return {
      type: "toggle",
      config: {
        key,
        label: opts?.label ?? camelToLabel(key),
        value: () => obj[key],
        onChange: (v: boolean) => {
          obj[key] = v;
          cb?.();
        }
      }
    };
  }
}

// eslint-disable-next-line no-redeclare, @typescript-eslint/no-namespace
export namespace select {
  /** Bind a select dropdown to a string or number property of the target object. */
  export function of<T>(
    target: T,
    key: KeysOfType<T, string | number>,
    opts: { options: Record<string, string | number>; label?: string },
    onChange?: () => void
  ): ControlConfig {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = target as any;
    return {
      type: "select",
      config: {
        key,
        label: opts.label ?? camelToLabel(key),
        options: opts.options,
        value: () => obj[key],
        onChange: (v: string | number) => {
          obj[key] = v;
          onChange?.();
        }
      }
    };
  }
}

// eslint-disable-next-line no-redeclare, @typescript-eslint/no-namespace
export namespace color {
  /** Bind a color picker to a color property of the target object. */
  export function of<T>(
    target: T,
    key: KeysOfType<T, string | { r: number; g: number; b: number }>,
    optsOrOnChange?:
      | { colorType?: "float" | "int"; alpha?: boolean; label?: string; displayFormat?: ColorDisplayFormat }
      | (() => void),
    onChange?: () => void
  ): ControlConfig {
    const isCallback = typeof optsOrOnChange === "function";
    const opts = isCallback ? undefined : optsOrOnChange;
    const cb = isCallback ? optsOrOnChange : onChange;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = target as any;
    return {
      type: "color",
      config: {
        key,
        label: opts?.label ?? camelToLabel(key),
        colorType: opts?.colorType,
        alpha: opts?.alpha,
        displayFormat: opts?.displayFormat,
        value: () => obj[key],
        onChange: (v: string | { r: number; g: number; b: number }) => {
          // the canvas color control reuses one module-level scratch object for
          // every onChange emission, so copy the values into the existing bound
          // object instead of storing the reference. retaining it would make
          // every color control alias that single scratch object.
          const cur = obj[key];
          if (v !== null && typeof v === "object" && cur !== null && typeof cur === "object") {
            Object.assign(cur, v);
          } else {
            obj[key] = v;
          }
          cb?.();
        }
      }
    };
  }
}

// eslint-disable-next-line no-redeclare, @typescript-eslint/no-namespace
export namespace text {
  /** Bind a text input to a string property of the target object. */
  export function of<T>(
    target: T,
    key: KeysOfType<T, string>,
    optsOrOnChange?: { label?: string } | (() => void),
    onChange?: () => void
  ): ControlConfig {
    const isCallback = typeof optsOrOnChange === "function";
    const opts = isCallback ? undefined : optsOrOnChange;
    const cb = isCallback ? optsOrOnChange : onChange;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = target as any;
    return {
      type: "text",
      config: {
        key,
        label: opts?.label ?? camelToLabel(key),
        value: () => obj[key],
        onChange: (v: string) => {
          obj[key] = v;
          cb?.();
        }
      }
    };
  }
}

// eslint-disable-next-line no-redeclare, @typescript-eslint/no-namespace
export namespace point2d {
  /** Bind a 2D point editor to an {x, y} property of the target object. */
  export function of<T>(
    target: T,
    key: KeysOfType<T, { x: number; y: number }>,
    optsOrOnChange?:
      | {
          label?: string;
          x?: { min?: number; max?: number; step?: number };
          y?: { min?: number; max?: number; step?: number };
        }
      | (() => void),
    onChange?: () => void
  ): ControlConfig {
    const isCallback = typeof optsOrOnChange === "function";
    const opts = isCallback ? undefined : optsOrOnChange;
    const cb = isCallback ? optsOrOnChange : onChange;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = target as any;
    return {
      type: "point2d",
      config: {
        key,
        label: opts?.label ?? camelToLabel(key),
        x: opts?.x,
        y: opts?.y,
        value: () => obj[key],
        onChange: (v: { x: number; y: number }) => {
          obj[key] = v;
          cb?.();
        }
      }
    };
  }
}

// eslint-disable-next-line no-redeclare, @typescript-eslint/no-namespace
export namespace point3d {
  /** Bind a 3D point editor to an {x, y, z} property of the target object. */
  export function of<T>(
    target: T,
    key: KeysOfType<T, { x: number; y: number; z: number }>,
    optsOrOnChange?: { label?: string } | (() => void),
    onChange?: () => void
  ): ControlConfig {
    const isCallback = typeof optsOrOnChange === "function";
    const opts = isCallback ? undefined : optsOrOnChange;
    const cb = isCallback ? optsOrOnChange : onChange;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = target as any;
    return {
      type: "point3d",
      config: {
        key,
        label: opts?.label ?? camelToLabel(key),
        value: () => obj[key],
        onChange: (v: { x: number; y: number; z: number }) => {
          obj[key] = v;
          cb?.();
        }
      }
    };
  }
}

/** Options for mounting the inspect panel into the DOM. */
export interface MountOptions extends BaseMountOptions, Partial<Omit<InspectTheme, "fontAtlas" | "borderRadius">> {
  theme?: "dark" | InspectTheme;
  widgetBorderRadius?: number;
  fontUrl?: string;
  fontData?: ArrayBuffer;
  fontFamily?: string;
  fontSize?: number;
}
