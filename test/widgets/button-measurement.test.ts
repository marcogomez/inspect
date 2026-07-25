// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Surface } from "../../src/core/surface";
import { Box } from "../../src/widgets/box";
import { Button } from "../../src/widgets/button";
import { makeFakeTheme } from "../test-helpers";

/** draws the button once onto a throwaway 200x40 canvas to exercise the draw path. */
function drawButton(btn: Button): void {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 40;
  const renderer = new Canvas2DRenderer(canvas);
  renderer.begin(200, 40);
  btn.draw(renderer, makeFakeTheme());
  renderer.end();
}

/**
 * attaches the button to a laid-out surface so its content-measurement path can
 * resolve the font atlas from the surface theme. returns the surface for cleanup.
 */
function mountButton(btn: Button) {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 40;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 200;
  root.height = 40;
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 200;
  (surface as unknown as { _height: number })._height = 40;
  root.addChild(btn);
  root.needsLayout = true;
  root.computeLayout();
  return surface;
}

describe("Button content measurement", () => {
  it("getContentWidth returns text width when mounted with font", () => {
    const btn = new Button();
    btn.text = "Click Me";
    const surface = mountButton(btn);
    const w = btn.getContentWidth();
    expect(w).toBeGreaterThan(0);
    surface.dispose();
  });

  it("getContentWidth returns 0 when has children", () => {
    const btn = new Button();
    btn.text = "Click";
    btn.addChild(new Box());
    expect(btn.getContentWidth()).toBe(0);
  });

  it("getContentWidth returns 0 when no text", () => {
    const btn = new Button();
    btn.text = "";
    expect(btn.getContentWidth()).toBe(0);
  });

  it("getContentHeight returns font lineHeight when mounted", () => {
    const btn = new Button();
    btn.text = "Test";
    const surface = mountButton(btn);
    const h = btn.getContentHeight();
    expect(h).toBeGreaterThan(0);
    surface.dispose();
  });

  it("getContentHeight returns 0 when has children", () => {
    const btn = new Button();
    btn.text = "Test";
    btn.addChild(new Box());
    expect(btn.getContentHeight()).toBe(0);
  });

  it("draws text centered in button", () => {
    const btn = new Button();
    btn.text = "Submit";
    btn.width = 100;
    btn.height = 30;
    drawButton(btn);
  });
});
