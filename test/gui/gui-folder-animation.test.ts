// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { GuiFolder } from "../../src/gui/gui-folder";
import { Box } from "../../src/widgets/box";
import { makeFakeInspectTheme } from "../test-helpers";

/** builds a 400x600 surface with a vertical-stack root, flushed, returning the surface, root, and theme. */
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
  return { surface, root, theme };
}

describe("GuiFolder animation", () => {
  it("starts animation when toggling expanded with surface", () => {
    const { root, surface, theme } = createWidgetTree();
    const f = new GuiFolder();
    f.id = "anim";
    f.title = "Animated Folder";
    f.animated = true;
    f.applyTheme(theme);
    root.addChild(f);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    f.expanded = false;
    f.expanded = true;

    surface.dispose();
  });

  it("animation tick runs and completes", async () => {
    const { root, surface, theme } = createWidgetTree();
    const f = new GuiFolder();
    f.id = "anim";
    f.title = "Animated";
    f.animated = true;
    f.applyTheme(theme);
    root.addChild(f);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    f.expanded = false;

    await new Promise((resolve) => setTimeout(resolve, 300));

    surface.dispose();
  });

  it("cancels animation when toggling rapidly", () => {
    const { root, surface, theme } = createWidgetTree();
    const f = new GuiFolder();
    f.id = "rapid";
    f.title = "Rapid Toggle";
    f.animated = true;
    f.applyTheme(theme);
    root.addChild(f);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    f.expanded = false;
    f.expanded = true;
    f.expanded = false;

    surface.dispose();
  });
});
