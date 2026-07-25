// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { GuiColor } from "../../src/gui/gui-color";
import { Box } from "../../src/widgets/box";
import { makeFakeInspectTheme } from "../test-helpers";

describe("GuiColor hexNibble fallback for invalid chars", () => {
  it("parses hex with invalid characters returning 0 for each", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    const renderer = new Canvas2DRenderer(canvas);
    const theme = makeFakeInspectTheme();
    const surface = new Surface(canvas, renderer, theme);
    const root = new Box();
    root.width = 400;
    root.height = 600;
    root.layout = new StackLayout("vertical", 0, "start", "stretch");
    surface.setRoot(root);
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 600;

    const color = new GuiColor({
      key: "c",
      label: "C",
      value: () => "#GGGGGG",
      onChange: vi.fn(),
      mode: "hex"
    });
    color.applyTheme(theme);
    root.addChild(color);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();
    surface.dispose();
  });
});

describe("GuiColor closePicker from open state", () => {
  it("removes backdrop and picker from root", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    const renderer = new Canvas2DRenderer(canvas);
    const theme = makeFakeInspectTheme();
    const surface = new Surface(canvas, renderer, theme);
    const root = new Box();
    root.width = 400;
    root.height = 600;
    root.layout = new StackLayout("vertical", 0, "start", "stretch");
    surface.setRoot(root);
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 600;

    const color = new GuiColor({
      key: "c",
      label: "C",
      value: () => ({ r: 1, g: 0, b: 0, a: 1 }),
      onChange: vi.fn(),
      alpha: true
    });
    color.applyTheme(theme);
    root.addChild(color);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    (color as unknown as { openPicker: () => void }).openPicker();
    (color as unknown as { closePicker: () => void }).closePicker();
    surface.dispose();
  });
});

describe("GuiColor alpha bar cache invalidation", () => {
  it("invalidates alpha cache when hue changes", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 600;
    const renderer = new Canvas2DRenderer(canvas);
    const theme = makeFakeInspectTheme();
    const surface = new Surface(canvas, renderer, theme);
    const root = new Box();
    root.width = 400;
    root.height = 600;
    root.layout = new StackLayout("vertical", 0, "start", "stretch");
    surface.setRoot(root);
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 600;

    const color = new GuiColor({
      key: "c",
      label: "C",
      value: () => ({ r: 1, g: 0.5, b: 0.2, a: 0.8 }),
      onChange: vi.fn(),
      alpha: true
    });
    color.applyTheme(theme);
    root.addChild(color);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    (color as unknown as { openPicker: () => void }).openPicker();
    surface.markDirty();
    surface.flush();
    (color as unknown as { updateHue: (x: number, w: number) => void }).updateHue(50, 200);
    surface.markDirty();
    surface.flush();
    surface.dispose();
  });
});
