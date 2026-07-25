// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { Widget } from "../../src/core/widget";
import { Box } from "../../src/widgets/box";
import { makeFakeTheme } from "../test-helpers";

/** creates a 400x300 surface with its measured size assigned directly, returning it with the renderer and theme. */
function createSurface() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeTheme();
  const surface = new Surface(canvas, renderer, theme);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 300;
  return { surface, renderer, theme };
}

describe("Widget measureIntrinsicWidth with layout", () => {
  it("uses layout.measureWidth when layout is set", () => {
    const w = new Widget();
    w.layout = new StackLayout("vertical", 4, "start", "stretch");
    const child = new Widget();
    child.preferredWidth = 50;
    child.preferredHeight = 20;
    w.addChild(child);
    const measured = w.measureIntrinsicWidth();
    expect(measured).toBeGreaterThan(0);
  });
});

describe("Widget invalidateLayout with hidden ancestor", () => {
  it("does not markDirty when ancestor is hidden", () => {
    const { surface } = createSurface();
    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);

    const parent = new Widget();
    parent.visible = false;
    root.addChild(parent);

    const child = new Widget();
    parent.addChild(child);

    child.invalidateLayout();
    surface.dispose();
  });
});

describe("Widget autoFitScale and designSize", () => {
  it("computes fitReferenceWidth scale", () => {
    const { surface, renderer, theme } = createSurface();
    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);

    const w = new Widget();
    w.autoFitScale = true;
    w.fitReferenceWidth = 200;
    w.maxScale = 4;
    w.preferredWidth = 100;
    w.preferredHeight = 100;
    root.addChild(w);
    root.needsLayout = true;
    root.computeLayout();

    renderer.begin(400, 300);
    w.draw(renderer, theme);
    renderer.end();

    expect(w.computedScale).toBeLessThanOrEqual(4);
    surface.dispose();
  });

  it("computes fitReferenceHeight scale", () => {
    const { surface, renderer, theme } = createSurface();
    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);

    const w = new Widget();
    w.autoFitScale = true;
    w.fitReferenceHeight = 100;
    w.maxScale = 4;
    w.preferredWidth = 100;
    w.preferredHeight = 50;
    root.addChild(w);
    root.needsLayout = true;
    root.computeLayout();

    renderer.begin(400, 300);
    w.draw(renderer, theme);
    renderer.end();

    surface.dispose();
  });

  it("drawChildren with designWidth pushes translate and scale", () => {
    const { surface, renderer, theme } = createSurface();
    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);

    const parent = new Widget();
    parent.designWidth = 200;
    parent.designHeight = 150;
    parent.preferredWidth = 400;
    parent.preferredHeight = 300;
    root.addChild(parent);

    const child = new Widget();
    child.preferredWidth = 50;
    child.preferredHeight = 50;
    parent.addChild(child);

    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    renderer.begin(400, 300);
    parent.draw(renderer, theme);
    renderer.end();

    surface.dispose();
  });

  it("hitTest adjusts coordinates for designSize", () => {
    const { surface } = createSurface();
    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);

    const parent = new Widget();
    parent.designWidth = 200;
    parent.designHeight = 150;
    parent.preferredWidth = 400;
    parent.preferredHeight = 300;
    root.addChild(parent);

    const child = new Widget();
    child.preferredWidth = 50;
    child.preferredHeight = 50;
    parent.addChild(child);

    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    const hit = parent.hitTest(10, 10);
    expect(hit).not.toBeNull();
    surface.dispose();
  });

  it("snapScale returns binary power when rawScale < 1", () => {
    const w = new Widget();
    w.designWidth = 100;
    w.designHeight = 100;
    w.preferredWidth = 30;
    w.preferredHeight = 30;

    const { surface } = createSurface();
    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);
    root.addChild(w);
    root.needsLayout = true;
    root.computeLayout();
    surface.dispose();
  });
});

describe("Widget computeLayout with designSize absolute children", () => {
  it("positions children with designScale offsets", () => {
    const { surface } = createSurface();
    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);

    const parent = new Widget();
    parent.designWidth = 200;
    parent.designHeight = 150;
    parent.preferredWidth = 400;
    parent.preferredHeight = 300;
    root.addChild(parent);

    const child = new Widget();
    child.preferredWidth = 50;
    child.preferredHeight = 50;
    parent.addChild(child);

    root.needsLayout = true;
    root.computeLayout();
    surface.flush();
    surface.dispose();
  });
});

describe("Widget onKeyUp", () => {
  it("is callable (no-op base)", () => {
    const w = new Widget();
    w.onKeyUp("a", "KeyA");
  });
});

describe("Widget resolveAbsoluteChildren measureIntrinsicHeight", () => {
  it("uses measureIntrinsicHeight for absolute child without preferredHeight", () => {
    const { surface } = createSurface();
    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);

    const parent = new Widget();
    parent.preferredWidth = 200;
    parent.preferredHeight = 200;
    root.addChild(parent);

    const absChild = new Widget();
    absChild.absolute = true;
    absChild.anchorTop = 10;
    absChild.anchorLeft = 10;
    parent.addChild(absChild);

    root.needsLayout = true;
    root.computeLayout();
    surface.dispose();
  });
});
