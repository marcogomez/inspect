import type { WidgetBuilder } from "./widget-builder";

/** Serializes and deserializes control state to/from plain objects for persistence. */
export class StateManager {
  /** collects current control and monitor values into a keyed state object. */
  public exportState(builder: WidgetBuilder): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    for (const [key, entry] of builder.monitors) {
      state[key] = entry.config.value();
    }

    for (const folder of builder.folders.values()) {
      for (const child of folder.children) {
        if ("config" in child) {
          const config = (child as { config: { key?: string; value?: () => unknown } }).config;
          if (config.key && config.value) {
            state[config.key] = config.value();
          }
        }
      }
    }

    return state;
  }

  /** applies a keyed state object back onto controls and refreshes monitors. */
  public importState(builder: WidgetBuilder, state: Record<string, unknown>): void {
    for (const folder of builder.folders.values()) {
      for (const child of folder.children) {
        if (!("config" in child)) {
          continue;
        }

        const widget = child as { config: { key?: string; onChange?: (v: unknown) => void }; refresh?: () => void };
        const key = widget.config.key;
        if (!key || !(key in state)) {
          continue;
        }

        const value = state[key];
        if (widget.config.onChange) {
          widget.config.onChange(value);
        }

        if (widget.refresh) {
          widget.refresh();
        }
      }
    }

    for (const [key, entry] of builder.monitors) {
      if (key in state) {
        entry.widget.refresh();
      }
    }
  }
}
