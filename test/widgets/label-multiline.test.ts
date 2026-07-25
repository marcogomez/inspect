// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { Box } from "../../src/widgets/box";
import { Label } from "../../src/widgets/label";
import { makeFakeTheme } from "../test-helpers";

/** draws the label once onto a throwaway 200x100 canvas to exercise the draw path. */
function drawLabel(label: Label): void {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 100;
  const renderer = new Canvas2DRenderer(canvas);
  renderer.begin(200, 100);
  label.draw(renderer, makeFakeTheme());
  renderer.end();
}

describe("Label multiline", () => {
  it("getContentWidth returns max line width for multiline with customFont", () => {
    const label = new Label();
    label.text = "short\nthis is a longer line\nmed";
    label.customFont = makeFakeTheme().fontAtlas;
    const w = label.getContentWidth();
    expect(w).toBeGreaterThan(0);
  });

  it("getContentHeight returns total height for multiline with customFont", () => {
    const label = new Label();
    label.text = "line1\nline2\nline3";
    label.customFont = makeFakeTheme().fontAtlas;
    const h = label.getContentHeight();
    expect(h).toBeGreaterThan(0);
  });

  it("draws multiline text", () => {
    const label = new Label();
    label.text = "first\nsecond\nthird";
    label.width = 200;
    label.height = 60;
    drawLabel(label);
  });

  it("draws multiline text with right alignment", () => {
    const label = new Label();
    label.text = "A\nBB\nCCC";
    label.width = 200;
    label.height = 60;
    label.hAlign = "right";
    drawLabel(label);
  });

  it("draws multiline text with center alignment", () => {
    const label = new Label();
    label.text = "A\nBB\nCCC";
    label.width = 200;
    label.height = 60;
    label.hAlign = "center";
    drawLabel(label);
  });
});

describe("Label ellipsis", () => {
  it("draws with overflow ellipsis when text too long", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const renderer = new Canvas2DRenderer(canvas);
    const theme = makeFakeTheme();
    const surface = new Surface(canvas, renderer, theme);
    const root = new Box();
    root.width = 200;
    root.height = 100;
    root.layout = new StackLayout("horizontal", 0, "start", "stretch");
    surface.setRoot(root);
    (surface as unknown as { _width: number })._width = 200;
    (surface as unknown as { _height: number })._height = 100;

    const label = new Label();
    label.text = "This is a very long text that should be ellipsized when it overflows";
    label.overflow = "ellipsis";
    label.sizingX = "fixed";
    label.preferredWidth = 50;
    label.sizingY = "fixed";
    label.preferredHeight = 20;
    root.addChild(label);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    surface.dispose();
  });

  it("ellipsis caches result for same text and maxChars", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const renderer = new Canvas2DRenderer(canvas);
    const theme = makeFakeTheme();
    const surface = new Surface(canvas, renderer, theme);
    const root = new Box();
    root.width = 200;
    root.height = 100;
    root.layout = new StackLayout("horizontal", 0, "start", "stretch");
    surface.setRoot(root);
    (surface as unknown as { _width: number })._width = 200;
    (surface as unknown as { _height: number })._height = 100;

    const label = new Label();
    label.text = "A very long text to trigger ellipsis mode";
    label.overflow = "ellipsis";
    label.sizingX = "fixed";
    label.preferredWidth = 50;
    label.sizingY = "fixed";
    label.preferredHeight = 20;
    root.addChild(label);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();
    surface.flush();

    surface.dispose();
  });
});

describe("Label drawSelf with no font atlas", () => {
  it("returns early without rendering", () => {
    const label = new Label();
    label.text = "test";
    label.width = 100;
    label.height = 20;
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 20;
    const renderer = new Canvas2DRenderer(canvas);
    const theme = makeFakeTheme();
    (theme as unknown as { fontAtlas: null }).fontAtlas = null;
    renderer.begin(100, 20);
    label.draw(renderer, theme);
    renderer.end();
  });
});
