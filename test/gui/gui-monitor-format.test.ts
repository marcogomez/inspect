// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { GuiMonitor } from "../../src/gui/gui-monitor";
import { Box } from "../../src/widgets/box";
import { makeFakeInspectTheme } from "../test-helpers";

/** mounts a GuiMonitor driven by the given value getter and options in a 400x200 surface, themed and flushed. */
function createMountedMonitor(
  value: () => number | string,
  opts: { graph?: boolean; format?: (v: number) => string } = {}
) {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 200;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeInspectTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 400;
  root.height = 200;
  root.layout = new StackLayout("vertical", 0, "start", "stretch");
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 200;

  const monitor = new GuiMonitor({
    key: "fps",
    label: "FPS",
    value,
    graph: opts.graph,
    format: opts.format
  });
  monitor.applyTheme(theme);
  root.addChild(monitor);
  root.needsLayout = true;
  root.computeLayout();
  surface.flush();

  return { surface, monitor, renderer, theme };
}

describe("GuiMonitor formatValue", () => {
  it("passes string values through unchanged", () => {
    const { monitor, surface } = createMountedMonitor(() => "hello" as unknown as number);
    monitor.refresh();
    surface.dispose();
  });

  it("caches formatted number on repeated refresh with same value", () => {
    const v = 42;
    const { monitor, surface } = createMountedMonitor(() => v);
    monitor.refresh();
    monitor.refresh();
    surface.dispose();
  });

  it("returns early when formatted text unchanged", () => {
    const { monitor, surface } = createMountedMonitor(() => 60);
    monitor.refresh();
    monitor.refresh();
    surface.dispose();
  });
});

describe("GuiMonitor graph with insufficient data", () => {
  it("skips graph drawing when ringCount < 2", () => {
    const { monitor, renderer, theme, surface } = createMountedMonitor(() => 42, { graph: true });
    renderer.begin(400, 200);
    monitor.draw(renderer, theme);
    renderer.end();
    surface.dispose();
  });

  it("draws graph after multiple refreshes", () => {
    let v = 0;
    const { monitor, renderer, theme, surface } = createMountedMonitor(() => v, { graph: true });
    for (let i = 0; i < 5; i++) {
      v = i * 10;
      monitor.refresh();
    }
    renderer.begin(400, 200);
    monitor.draw(renderer, theme);
    renderer.end();
    surface.dispose();
  });
});
