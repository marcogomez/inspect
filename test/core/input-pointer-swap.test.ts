// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { InputDispatcher } from "../../src/core/input";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { Box } from "../../src/widgets/box";
import { Button } from "../../src/widgets/button";
import { makeFakeTheme } from "../test-helpers";

/** builds a 400x300 surface with an empty vertical-stack root, returning the canvas, surface, and root. */
function createInputTree() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 400,
    bottom: 300,
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    toJSON: () => {
      /* no-op */
    }
  });
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeTheme();
  const surface = new Surface(canvas, renderer, theme);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 300;
  const root = new Box();
  root.width = 400;
  root.height = 300;
  root.layout = new StackLayout("vertical", 0, "start", "stretch");
  surface.setRoot(root);
  return { canvas, surface, root };
}

describe("InputDispatcher pointer slot swap on release", () => {
  it("swaps last active pointer into released slot on pointerUp", () => {
    const { canvas, surface, root } = createInputTree();
    const btn1 = new Button();
    btn1.sizingX = "grow";
    btn1.sizingY = "fixed";
    btn1.preferredHeight = 100;
    btn1.text = "A";
    root.addChild(btn1);
    const btn2 = new Button();
    btn2.sizingX = "grow";
    btn2.sizingY = "fixed";
    btn2.preferredHeight = 100;
    btn2.text = "B";
    root.addChild(btn2);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();
    new InputDispatcher(surface);

    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 50, pointerId: 1, button: 0, bubbles: true })
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 150, pointerId: 2, button: 0, bubbles: true })
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 50, clientY: 50, pointerId: 1, button: 0, bubbles: true })
    );
    surface.dispose();
  });

  it("swaps pointer slot on pointerCancel when not last", () => {
    const { canvas, surface, root } = createInputTree();
    const btn = new Button();
    btn.sizingX = "grow";
    btn.sizingY = "fixed";
    btn.preferredHeight = 150;
    btn.text = "X";
    root.addChild(btn);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();
    new InputDispatcher(surface);

    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 50, pointerId: 1, button: 0, bubbles: true })
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 60, clientY: 60, pointerId: 2, button: 0, bubbles: true })
    );
    canvas.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1, bubbles: true }));
    surface.dispose();
  });

  it("returns early from pointerDown when no hit target", () => {
    const { canvas, surface, root } = createInputTree();
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();
    new InputDispatcher(surface);
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 200, clientY: 200, pointerId: 1, button: 0, bubbles: true })
    );
    surface.dispose();
  });
});
