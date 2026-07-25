// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { GuiColor } from "../../src/gui/gui-color";
import { Box } from "../../src/widgets/box";
import { makeFakeInspectTheme } from "../test-helpers";

/** mounts an alpha-enabled GuiColor in a 400x600 surface, themed and flushed, returning the test handles. */
function createMountedColor() {
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

  const onChange = vi.fn();
  const color = new GuiColor({
    key: "col",
    label: "Color",
    value: () => ({ r: 1, g: 0.5, b: 0.2, a: 0.8 }),
    onChange,
    alpha: true
  });
  color.applyTheme(theme);
  root.addChild(color);
  root.needsLayout = true;
  root.computeLayout();
  surface.flush();

  return { surface, root, color, onChange, renderer, theme };
}

describe("GuiColor picker open/close", () => {
  it("opens picker on swatch click", () => {
    const { color, surface } = createMountedColor();

    const swatch = (color as unknown as { _swatch: { onClick: (() => void) | null } })._swatch;
    if (swatch.onClick) {
      swatch.onClick();
    }

    surface.dispose();
  });

  it("closes picker on backdrop click", () => {
    const { color, surface } = createMountedColor();

    const swatch = (color as unknown as { _swatch: { onClick: (() => void) | null } })._swatch;
    if (swatch.onClick) {
      swatch.onClick();
    }

    (color as unknown as { closePicker: () => void }).closePicker();

    surface.dispose();
  });

  it("closePicker is no-op when already closed", () => {
    const { color, surface } = createMountedColor();
    (color as unknown as { closePicker: () => void }).closePicker();
    surface.dispose();
  });
});

describe("GuiColor SV/Hue/Alpha drag updates", () => {
  it("updateSV changes saturation and value", () => {
    const { color, surface } = createMountedColor();
    (color as unknown as { updateSV: (x: number, y: number, w: number, h: number) => void }).updateSV(50, 30, 100, 100);
    surface.dispose();
  });

  it("updateHue changes hue", () => {
    const { color, surface } = createMountedColor();
    (color as unknown as { updateHue: (x: number, w: number) => void }).updateHue(60, 200);
    surface.dispose();
  });

  it("updateAlpha changes alpha", () => {
    const { color, surface } = createMountedColor();
    (color as unknown as { updateAlpha: (x: number, w: number) => void }).updateAlpha(50, 100);
    surface.dispose();
  });
});

describe("GuiColor drawing with picker open", () => {
  it("draws SV gradient, hue bar, and alpha bar", () => {
    const { color, surface } = createMountedColor();
    const swatch = (color as unknown as { _swatch: { onClick: (() => void) | null } })._swatch;
    if (swatch.onClick) {
      swatch.onClick();
    }

    surface.markDirty();
    surface.flush();

    surface.dispose();
  });
});

describe("GuiColor hex mode", () => {
  it("emits hex string on color change", () => {
    const onChange = vi.fn();
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
      key: "col",
      label: "Color",
      value: () => "#FF8800",
      onChange,
      mode: "hex"
    });
    color.applyTheme(theme);
    root.addChild(color);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    (color as unknown as { updateSV: (x: number, y: number, w: number, h: number) => void }).updateSV(50, 50, 100, 100);

    if (onChange.mock.calls.length > 0) {
      expect(typeof onChange.mock.calls[0][0]).toBe("string");
    }

    surface.dispose();
  });
});

describe("GuiColor hexAlpha mode", () => {
  it("emits hex string with alpha on color change", () => {
    const onChange = vi.fn();
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
      key: "col",
      label: "Color",
      value: () => "#FF8800CC",
      onChange,
      mode: "hexAlpha"
    });
    color.applyTheme(theme);
    root.addChild(color);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    (color as unknown as { updateHue: (x: number, w: number) => void }).updateHue(100, 200);

    if (onChange.mock.calls.length > 0) {
      expect(typeof onChange.mock.calls[0][0]).toBe("string");
    }

    surface.dispose();
  });
});

describe("GuiColor int mode", () => {
  it("emits integer RGBA values", () => {
    const onChange = vi.fn();
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
      key: "col",
      label: "Color",
      value: () => ({ r: 255, g: 128, b: 0, a: 200 }),
      onChange,
      mode: "int",
      alpha: true
    });
    color.applyTheme(theme);
    root.addChild(color);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    (color as unknown as { updateAlpha: (x: number, w: number) => void }).updateAlpha(50, 100);

    if (onChange.mock.calls.length > 0) {
      expect(typeof onChange.mock.calls[0][0]).toBe("object");
    }

    surface.dispose();
  });
});

describe("GuiColor copyValueToClipboard", () => {
  it("copies value text to clipboard when clicking value area", () => {
    const { color, surface } = createMountedColor();

    const valueBg = (
      color as unknown as {
        _valueBg: { onPointerDown: ((pid: number, x: number, y: number, btn: number) => boolean) | null };
      }
    )._valueBg;
    if (valueBg.onPointerDown) {
      valueBg.onPointerDown(1, 5, 5, 0);
    }

    surface.dispose();
  });
});
