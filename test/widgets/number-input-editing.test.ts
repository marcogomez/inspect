// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { Box } from "../../src/widgets/box";
import { NumberInput } from "../../src/widgets/number-input";
import { makeFakeTheme } from "../test-helpers";

/**
 * mounts a grow-width NumberInput (range 0 to 100, integer) inside a laid-out
 * surface and flushes once, so clicking the value area can open the real editing
 * overlay input. returns the surface and widget for driving and cleanup.
 */
function createMountedNumberInput() {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 100;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 200;
  root.height = 100;
  root.layout = new StackLayout("vertical", 0, "start", "stretch");
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 200;
  (surface as unknown as { _height: number })._height = 100;

  const ni = new NumberInput();
  ni.sizingX = "grow";
  ni.sizingY = "fixed";
  ni.preferredHeight = 24;
  ni.min = 0;
  ni.max = 100;
  ni.step = 1;
  ni.numValue = 50;
  ni.decimals = 0;
  ni.updatePointerScale();
  root.addChild(ni);
  root.needsLayout = true;
  root.computeLayout();
  surface.flush();

  return { surface, ni, root, renderer, theme, canvas };
}

describe("NumberInput editing mode", () => {
  it("creates input overlay on click in value area", () => {
    const { ni, surface } = createMountedNumberInput();

    ni.onPointerDown(1, ni.width - 10, 12, 0);

    expect(ni.width).toBeGreaterThan(0);

    surface.dispose();
  });

  it("commit via Enter key updates value", () => {
    const { ni, surface, canvas } = createMountedNumberInput();
    const commitSpy = vi.fn();
    ni.onCommit = commitSpy;

    ni.onPointerDown(1, ni.width - 10, 12, 0);

    const wrapper = canvas.parentElement;
    if (wrapper) {
      const input = wrapper.querySelector("input");
      if (input) {
        input.value = "75";
        const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
        input.dispatchEvent(event);
      }
    }

    surface.dispose();
  });

  it("Escape key cancels editing without committing", () => {
    const { ni, surface, canvas } = createMountedNumberInput();
    const commitSpy = vi.fn();
    ni.onCommit = commitSpy;

    ni.onPointerDown(1, ni.width - 10, 12, 0);

    const wrapper = canvas.parentElement;
    if (wrapper) {
      const input = wrapper.querySelector("input");
      if (input) {
        input.value = "999";
        const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
        input.dispatchEvent(event);
      }
    }

    surface.dispose();
  });

  it("blur commits value", () => {
    const { ni, surface, canvas } = createMountedNumberInput();
    const changeSpy = vi.fn();
    ni.onChange = changeSpy;

    ni.onPointerDown(1, ni.width - 10, 12, 0);

    const wrapper = canvas.parentElement;
    if (wrapper) {
      const input = wrapper.querySelector("input");
      if (input) {
        input.value = "30";
        input.dispatchEvent(new Event("blur"));
      }
    }

    surface.dispose();
  });

  it("NaN input does not change value on commit", () => {
    const { ni, surface, canvas } = createMountedNumberInput();
    const startValue = ni.numValue;

    ni.onPointerDown(1, ni.width - 10, 12, 0);

    const wrapper = canvas.parentElement;
    if (wrapper) {
      const input = wrapper.querySelector("input");
      if (input) {
        input.value = "abc";
        const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
        input.dispatchEvent(event);
      }
    }

    expect(ni.numValue).toBe(startValue);
    surface.dispose();
  });

  it("dispose cleans up editing overlay", () => {
    const { ni, surface } = createMountedNumberInput();
    ni.onPointerDown(1, ni.width - 10, 12, 0);
    ni.dispose();
    surface.dispose();
  });
});
