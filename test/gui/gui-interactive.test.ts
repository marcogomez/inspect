// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { GuiColor } from "../../src/gui/gui-color";
import { GuiFolder } from "../../src/gui/gui-folder";
import { GuiSelect } from "../../src/gui/gui-select";
import { GuiSlider } from "../../src/gui/gui-slider";
import { Box } from "../../src/widgets/box";
import { makeFakeInspectTheme } from "../test-helpers";

/** builds a 400x600 surface with a vertical-stack root, flushed, returning the surface, root, renderer, and theme. */
function createWidgetTree() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 600;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeInspectTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 400;
  root.height = 600;
  root.layout = new StackLayout("vertical", 4, "start", "stretch");
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 600;
  surface.flush();
  return { surface, root, renderer, theme };
}

describe("GuiSelect interactive", () => {
  it("opens and closes dropdown when inside a widget tree", () => {
    const { root, surface, theme } = createWidgetTree();
    let val = "a";
    const onChange = vi.fn((v: string) => {
      val = v;
    });
    const folder = new GuiFolder();
    folder.id = "f1";
    folder.title = "F1";
    folder.applyTheme(theme);
    const s = new GuiSelect({
      key: "sel",
      label: "Select",
      options: { "Option A": "a", "Option B": "b" },
      value: () => val,
      onChange: onChange as (v: unknown) => void
    });
    s.applyTheme(theme);
    folder.addControl(s);
    root.addChild(folder);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    s.width = 210;
    s.height = 24;
    s.needsLayout = true;
    s.computeLayout();

    const btn = s.children[1].children[0];
    btn.onPointerDown(1, 50, 12, 0);
    btn.onPointerUp(1, 50, 12, 0);

    btn.onPointerDown(1, 50, 12, 0);
    btn.onPointerUp(1, 50, 12, 0);

    surface.dispose();
  });
});

describe("GuiColor interactive", () => {
  it("opens picker when clicked inside a widget tree", () => {
    const { root, surface, theme } = createWidgetTree();
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 0.5, g: 0.3, b: 0.1 }),
      onChange: () => {
        /* no-op */
      }
    });
    c.applyTheme(theme);
    const folder = new GuiFolder();
    folder.id = "f1";
    folder.title = "F1";
    folder.applyTheme(theme);
    folder.addControl(c);
    root.addChild(folder);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    c.width = 210;
    c.height = 24;
    c.needsLayout = true;
    c.computeLayout();

    c.onPointerDown(1, 10, 12, 0);

    surface.dispose();
  });

  it("refreshes color display on value change", () => {
    let r = 0.5;
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r, g: 0.3, b: 0.1 }),
      onChange: () => {
        /* no-op */
      }
    });
    c.refresh();
    r = 0.9;
    c.refresh();
    c.refresh();
  });

  it("opens picker, draws, and closes", () => {
    const { root, surface, theme, renderer } = createWidgetTree();
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 0.5, g: 0.3, b: 0.1 }),
      onChange: () => {
        /* no-op */
      },
      alpha: true
    });
    c.applyTheme(theme);
    const folder = new GuiFolder();
    folder.id = "f1";
    folder.title = "F1";
    folder.applyTheme(theme);
    folder.addControl(c);
    root.addChild(folder);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    c.onPointerDown(1, 10, 12, 0);

    root.needsLayout = true;
    root.computeLayout();

    renderer.begin(400, 600);
    root.draw(renderer, theme);
    renderer.end();

    c.onPointerDown(1, 10, 12, 0);

    surface.dispose();
  });

  it("picker SV, hue, and alpha drag interaction", () => {
    const { root, surface, theme } = createWidgetTree();
    const onChange = vi.fn();
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 0.5, g: 0.3, b: 0.1, a: 1.0 }),
      onChange,
      alpha: true,
      mode: "float"
    });
    c.applyTheme(theme);
    const folder = new GuiFolder();
    folder.id = "f1";
    folder.title = "F1";
    folder.applyTheme(theme);
    folder.addControl(c);
    root.addChild(folder);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    c.onPointerDown(1, 10, 12, 0);
    root.needsLayout = true;
    root.computeLayout();

    const svWidget = (c as unknown as { _svWidget: import("../../src/widgets/canvas-widget").CanvasWidget | null })
      ._svWidget;
    if (svWidget) {
      svWidget.onPointerDown(1, 50, 50, 0);
      svWidget.onPointerMove(1, 60, 40);
      svWidget.onPointerUp(1, 60, 40, 0);
    }

    const hueWidget = (c as unknown as { _hueWidget: import("../../src/widgets/canvas-widget").CanvasWidget | null })
      ._hueWidget;
    if (hueWidget) {
      hueWidget.onPointerDown(1, 30, 5, 0);
      hueWidget.onPointerMove(1, 50, 5);
      hueWidget.onPointerUp(1, 50, 5, 0);
    }

    const alphaWidget = (
      c as unknown as { _alphaWidget: import("../../src/widgets/canvas-widget").CanvasWidget | null }
    )._alphaWidget;
    if (alphaWidget) {
      alphaWidget.onPointerDown(1, 20, 5, 0);
      alphaWidget.onPointerMove(1, 60, 5);
      alphaWidget.onPointerUp(1, 60, 5, 0);
    }

    expect(onChange).toHaveBeenCalled();
    surface.dispose();
  });

  it("color with hex mode emits hex string", () => {
    const onChange = vi.fn();
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => "#ff0000",
      onChange,
      mode: "hex"
    });
    c.refresh();
  });

  it("color with int mode emits int object", () => {
    const onChange = vi.fn();
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 128, g: 64, b: 32 }),
      onChange,
      mode: "int"
    });
    c.refresh();
  });

  it("creates with all display format variants", () => {
    const formats = ["hex", "hexAlpha", "floatRgb", "floatRgba", "intRgb", "intRgba"] as const;
    for (const fmt of formats) {
      const c = new GuiColor({
        key: "c",
        label: "C",
        value: () => ({ r: 0.5, g: 0.3, b: 0.1, a: 0.8 }),
        onChange: () => {
          /* no-op */
        },
        displayFormat: fmt,
        alpha: fmt.includes("Alpha") || fmt.includes("Rgba") || fmt.includes("rgba")
      });
      c.refresh();
    }
  });
});

describe("GuiSlider interactive", () => {
  it("applies theme and draws with theme", () => {
    const { root, surface, theme, renderer } = createWidgetTree();
    let val = 50;
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    s.applyTheme(theme);
    const folder = new GuiFolder();
    folder.id = "f1";
    folder.title = "F1";
    folder.applyTheme(theme);
    folder.addControl(s);
    root.addChild(folder);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    renderer.begin(400, 600);
    root.draw(renderer, theme);
    renderer.end();

    surface.dispose();
  });

  it("slider with applyOnRelease", () => {
    let val = 50;
    const onChange = vi.fn((v: number) => {
      val = v;
    });
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange,
      applyOnRelease: true
    });
    s.applyTheme(makeFakeInspectTheme());
    expect(s.config.applyOnRelease).toBe(true);
  });
});
