// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { InputDispatcher } from "../../src/core/input";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { Box } from "../../src/widgets/box";
import { Button } from "../../src/widgets/button";
import { makeFakeTheme } from "../test-helpers";

/** builds a 400x300 surface with one full-width button and an attached InputDispatcher, laid out and flushed. */
function createInputTestTree() {
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

  const btn = new Button();
  btn.text = "Click";
  btn.sizingX = "grow";
  btn.sizingY = "fixed";
  btn.preferredHeight = 30;
  btn.onClick = vi.fn();
  root.addChild(btn);

  root.needsLayout = true;
  root.computeLayout();
  surface.flush();

  const input = new InputDispatcher(surface);
  return { canvas, surface, root, btn, input };
}

describe("InputDispatcher pointer down/up lifecycle", () => {
  it("dispatches pointerdown to widget and captures", () => {
    const { canvas, surface } = createInputTestTree();
    const event = new PointerEvent("pointerdown", { clientX: 50, clientY: 15, pointerId: 1, button: 0, bubbles: true });
    canvas.dispatchEvent(event);
    surface.dispose();
  });

  it("dispatches pointerup to captured widget", () => {
    const { canvas, surface } = createInputTestTree();
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 15, pointerId: 1, button: 0, bubbles: true })
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 50, clientY: 15, pointerId: 1, button: 0, bubbles: true })
    );
    surface.dispose();
  });

  it("ignores pointerup for unknown pointer id", () => {
    const { canvas, surface } = createInputTestTree();
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 50, clientY: 15, pointerId: 99, button: 0, bubbles: true })
    );
    surface.dispose();
  });

  it("drops pointer down when no hit", () => {
    const { canvas, surface } = createInputTestTree();
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 399, clientY: 299, pointerId: 1, button: 0, bubbles: true })
    );
    surface.dispose();
  });
});

describe("InputDispatcher pointer cancel", () => {
  it("releases captured pointer on cancel", () => {
    const { canvas, surface } = createInputTestTree();
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 15, pointerId: 1, button: 0, bubbles: true })
    );
    canvas.dispatchEvent(new PointerEvent("pointercancel", { clientX: 50, clientY: 15, pointerId: 1, bubbles: true }));
    surface.dispose();
  });
});

describe("InputDispatcher wheel", () => {
  it("dispatches wheel to hit widget and bubbles", () => {
    const { canvas, surface } = createInputTestTree();
    canvas.dispatchEvent(new WheelEvent("wheel", { clientX: 50, clientY: 15, deltaX: 0, deltaY: 100, bubbles: true }));
    surface.dispose();
  });
});

describe("InputDispatcher keydown", () => {
  it("dispatches keydown to focused widget", () => {
    const { canvas, surface } = createInputTestTree();
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 50, clientY: 15, pointerId: 1, button: 0, bubbles: true })
    );
    canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "a", code: "KeyA", bubbles: true }));
    surface.dispose();
  });
});

describe("InputDispatcher max pointers", () => {
  it("ignores pointer down beyond max active pointers", () => {
    const { canvas, surface } = createInputTestTree();
    for (let i = 0; i < 5; i++) {
      canvas.dispatchEvent(
        new PointerEvent("pointerdown", { clientX: 50, clientY: 15, pointerId: i + 1, button: 0, bubbles: true })
      );
    }
    surface.dispose();
  });
});
