import { describe, expect, it, vi } from "vitest";

import { Widget } from "../../src/core/widget";
import { WidgetBuilder } from "../../src/panel/widget-builder";
import { createDarkTheme } from "../../src/themes/dark";

import type { FontAtlas } from "../../src/core/atlas";
import type { InspectTheme } from "../../src/themes/inspect-theme";
import type { ControlConfig } from "../../src/types";

/** dark theme over a stub atlas carrying just the two metrics the builder reads. */
function makeTheme(): InspectTheme {
  return createDarkTheme({ charWidth: 7, lineHeight: 14 } as FontAtlas);
}

/** slider control config whose value is backed by a private closure variable. */
function makeSliderControl(key: string): ControlConfig {
  let val = 0;
  return {
    type: "slider",
    config: {
      key,
      label: key,
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v: number) => {
        val = v;
      }
    }
  };
}

/** toggle control config backed by a private boolean closure variable. */
function makeToggleControl(key: string): ControlConfig {
  let val = false;
  return {
    type: "toggle",
    config: {
      key,
      label: key,
      value: () => val,
      onChange: (v: boolean) => {
        val = v;
      }
    }
  };
}

/** monitor control config reading its value from the supplied getter. */
function makeMonitorControl(key: string, val: () => number): ControlConfig {
  return {
    type: "monitor",
    config: { key, label: key, value: val }
  };
}

describe("WidgetBuilder", () => {
  describe("buildFolder", () => {
    it("creates a folder with id and title", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "Folder 1", controls: [] });
      expect(folder.id).toBe("f1");
      expect(folder.title).toBe("Folder 1");
    });

    it("stores folder in the folders map", () => {
      const wb = new WidgetBuilder(makeTheme());
      wb.buildFolder({ id: "f1", title: "Folder 1", controls: [] });
      expect(wb.folders.has("f1")).toBe(true);
    });

    it("defaults expanded to false", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "Folder 1", controls: [] });
      expect(folder.expanded).toBe(false);
    });

    it("respects explicit expanded value", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "Folder 1", controls: [], expanded: true });
      expect(folder.expanded).toBe(true);
    });
  });

  describe("buildControls", () => {
    it("builds slider control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [makeSliderControl("brightness")]);
    });

    it("builds toggle control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [makeToggleControl("enabled")]);
    });

    it("builds button control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      const spy = vi.fn();
      wb.buildControls(folder, [{ type: "button", config: { key: "btn", title: "Click", onClick: spy } }]);
    });

    it("builds select control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      let val: string | number = "a";
      wb.buildControls(folder, [
        {
          type: "select",
          config: {
            key: "mode",
            label: "Mode",
            options: { A: "a", B: "b" },
            value: () => val,
            onChange: (v: string | number) => {
              val = v;
            }
          }
        }
      ]);
    });

    it("builds monitor control and stores in monitors map", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [makeMonitorControl("fps", () => 60)]);
      expect(wb.monitors.has("fps")).toBe(true);
    });

    it("builds color control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [
        {
          type: "color",
          config: {
            key: "sky",
            label: "Sky",
            value: () => ({ r: 0.5, g: 0.3, b: 0.8 }),
            onChange: () => {
              /* no-op */
            }
          }
        }
      ]);
    });

    it("builds text control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      let val = "hello";
      wb.buildControls(folder, [
        {
          type: "text",
          config: {
            key: "name",
            label: "Name",
            value: () => val,
            onChange: (v: string) => {
              val = v;
            }
          }
        }
      ]);
    });

    it("builds separator control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [{ type: "separator", config: {} as never }]);
    });

    it("builds buttonRow control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [
        {
          type: "buttonRow",
          config: {
            key: "row",
            buttons: [
              {
                title: "A",
                onClick: () => {
                  /* no-op */
                }
              }
            ]
          }
        }
      ]);
    });

    it("builds subfolder with nested controls", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [
        {
          type: "subfolder",
          config: { key: "sub", title: "Sub", expanded: true, controls: [makeSliderControl("val")] }
        }
      ]);
    });

    it("builds reorderList control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [
        {
          type: "reorderList",
          config: {
            key: "order",
            items: [{ id: "a", label: "A" }],
            onChange: () => {
              /* no-op */
            }
          }
        }
      ]);
      expect(wb.reorderLists.has("order")).toBe(true);
    });

    it("builds textLog control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [
        {
          type: "textLog",
          config: { key: "log", getValue: () => "test" }
        }
      ]);
      expect(wb.textLogs.has("log")).toBe(true);
    });

    it("builds point2d control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [
        {
          type: "point2d",
          config: {
            key: "pos",
            label: "Position",
            value: () => ({ x: 0, y: 0 }),
            onChange: () => {
              /* no-op */
            }
          }
        }
      ]);
    });

    it("builds point3d control", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [
        {
          type: "point3d",
          config: {
            key: "pos",
            label: "Position",
            value: () => ({ x: 0, y: 0, z: 0 }),
            onChange: () => {
              /* no-op */
            }
          }
        }
      ]);
    });

    it("uses custom builder for unknown control type", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      const customWidget = new Widget();
      const customBuilder = vi.fn(() => customWidget);
      wb.buildControls(folder, [{ type: "custom" as never, config: { key: "myWidget" } as never }], {
        custom: customBuilder
      });
      expect(customBuilder).toHaveBeenCalled();
      expect(wb.customControls.has("myWidget")).toBe(true);
    });

    it("returns null for unknown type without custom builder", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      const result = wb.buildControl(folder, { type: "nonexistent" as never, config: {} as never });
      expect(result).toBeNull();
    });
  });

  describe("refreshMonitors", () => {
    it("refreshes visible monitors", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      let val = 60;
      wb.buildControls(folder, [makeMonitorControl("fps", () => val)]);
      val = 30;
      wb.refreshMonitors();
    });
  });

  describe("refreshTextLogs", () => {
    it("refreshes visible text logs", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      let val = "first";
      wb.buildControls(folder, [
        {
          type: "textLog",
          config: { key: "log", getValue: () => val }
        }
      ]);
      val = "second";
      wb.refreshTextLogs();
    });
  });

  describe("clear", () => {
    it("clears all maps and lists", () => {
      const wb = new WidgetBuilder(makeTheme());
      const folder = wb.buildFolder({ id: "f1", title: "F", controls: [] });
      wb.buildControls(folder, [
        makeSliderControl("val"),
        makeMonitorControl("fps", () => 60),
        { type: "textLog", config: { key: "log", getValue: () => "" } },
        {
          type: "reorderList",
          config: {
            key: "order",
            items: [],
            onChange: () => {
              /* no-op */
            }
          }
        }
      ]);
      wb.clear();
      expect(wb.monitors.size).toBe(0);
      expect(wb.textLogs.size).toBe(0);
      expect(wb.folders.size).toBe(0);
      expect(wb.reorderLists.size).toBe(0);
      expect(wb.customControls.size).toBe(0);
    });
  });
});
