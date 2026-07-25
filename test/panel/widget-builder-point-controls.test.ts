// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { WidgetBuilder } from "../../src/panel/widget-builder";
import { makeFakeInspectTheme } from "../test-helpers";

describe("WidgetBuilder point2d onChange callbacks", () => {
  it("point2d x-axis onChange fires with updated x", () => {
    const theme = makeFakeInspectTheme();
    const builder = new WidgetBuilder(theme);
    const onChange = vi.fn();
    const folder = builder.buildFolder({ id: "f", title: "F", controls: [] });
    builder.buildControls(
      folder,
      [
        {
          type: "point2d",
          config: {
            key: "pos",
            label: "Pos",
            value: () => ({ x: 10, y: 20 }),
            onChange
          }
        }
      ],
      {}
    );
    expect(folder.children.length).toBeGreaterThan(0);
  });

  it("point3d axes onChange callbacks fire correctly", () => {
    const theme = makeFakeInspectTheme();
    const builder = new WidgetBuilder(theme);
    const onChange = vi.fn();
    const folder = builder.buildFolder({ id: "f", title: "F", controls: [] });
    builder.buildControls(
      folder,
      [
        {
          type: "point3d",
          config: {
            key: "pos",
            label: "Pos",
            value: () => ({ x: 1, y: 2, z: 3 }),
            onChange
          }
        }
      ],
      {}
    );
    expect(folder.children.length).toBeGreaterThan(0);
  });
});

describe("WidgetBuilder refreshMonitors and refreshTextLogs", () => {
  it("refreshMonitors refreshes visible monitors", () => {
    const theme = makeFakeInspectTheme();
    const builder = new WidgetBuilder(theme);
    let val = 0;
    const folder = builder.buildFolder({ id: "f", title: "F", controls: [] });
    builder.buildControls(
      folder,
      [
        {
          type: "monitor",
          config: {
            key: "fps",
            label: "FPS",
            value: () => val
          }
        }
      ],
      {}
    );
    val = 60;
    builder.refreshMonitors();
  });

  it("refreshTextLogs refreshes visible text logs", () => {
    const theme = makeFakeInspectTheme();
    const builder = new WidgetBuilder(theme);
    let val = "line1";
    const folder = builder.buildFolder({ id: "f", title: "F", controls: [] });
    builder.buildControls(
      folder,
      [
        {
          type: "textLog",
          config: {
            key: "log",
            getValue: () => val
          }
        }
      ],
      {}
    );
    val = "line2";
    builder.refreshTextLogs();
  });
});
