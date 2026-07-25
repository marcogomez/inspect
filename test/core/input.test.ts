// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { InputDispatcher } from "../../src/core/input";
import { Surface } from "../../src/core/surface";
import { Widget } from "../../src/core/widget";
import { makeFakeTheme } from "../test-helpers";

/** builds a 400x300 surface with a root widget and an attached InputDispatcher for pointer and key tests. */
function createInputSystem(): {
  surface: Surface;
  input: InputDispatcher;
  canvas: HTMLCanvasElement;
  root: Widget;
} {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      toJSON() {
        /* no-op */
      }
    })
  });
  const renderer = new Canvas2DRenderer(canvas);
  const surface = new Surface(canvas, renderer, makeFakeTheme());
  const root = new Widget();
  root.width = 400;
  root.height = 300;
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 300;
  surface.flush();
  const input = new InputDispatcher(surface);
  return { surface, input, canvas, root };
}

/** dispatches a bubbling PointerEvent of the given type at client (x, y). */
function firePointerEvent(
  canvas: HTMLCanvasElement,
  type: string,
  x: number,
  y: number,
  pointerId = 1,
  button = 0
): void {
  canvas.dispatchEvent(
    new PointerEvent(type, {
      clientX: x,
      clientY: y,
      pointerId,
      button,
      bubbles: true
    })
  );
}

describe("InputDispatcher", () => {
  describe("construction", () => {
    it("creates without error", () => {
      const { input, surface } = createInputSystem();
      expect(input).toBeDefined();
      input.dispose();
      surface.dispose();
    });

    it("starts with zero active pointers", () => {
      const { input, surface } = createInputSystem();
      expect(input.getActivePointerCount()).toBe(0);
      input.dispose();
      surface.dispose();
    });
  });

  describe("focus management", () => {
    it("sets focus on a widget", () => {
      const { input, surface } = createInputSystem();
      const w = new Widget();
      w.focusable = true;
      input.setFocus(w);
      expect(w.focused).toBe(true);
      input.dispose();
      surface.dispose();
    });

    it("blurs the previous widget when focusing a new one", () => {
      const { input, surface } = createInputSystem();
      const w1 = new Widget();
      w1.focusable = true;
      const w2 = new Widget();
      w2.focusable = true;
      input.setFocus(w1);
      input.setFocus(w2);
      expect(w1.focused).toBe(false);
      expect(w2.focused).toBe(true);
      input.dispose();
      surface.dispose();
    });

    it("calls onFocus and onBlur", () => {
      const { input, surface } = createInputSystem();
      const w = new Widget();
      w.focusable = true;
      const focusSpy = vi.fn();
      const blurSpy = vi.fn();
      w.onFocus = focusSpy;
      w.onBlur = blurSpy;
      input.setFocus(w);
      expect(focusSpy).toHaveBeenCalledOnce();
      input.setFocus(null);
      expect(blurSpy).toHaveBeenCalledOnce();
      input.dispose();
      surface.dispose();
    });

    it("does nothing when setting focus to the same widget", () => {
      const { input, surface } = createInputSystem();
      const w = new Widget();
      w.focusable = true;
      const focusSpy = vi.fn();
      w.onFocus = focusSpy;
      input.setFocus(w);
      input.setFocus(w);
      expect(focusSpy).toHaveBeenCalledOnce();
      input.dispose();
      surface.dispose();
    });
  });

  describe("pointer down / up", () => {
    it("captures a pointer when widget accepts pointer down", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      child.onPointerDown = () => true;
      root.addChild(child);
      root.computeLayout();
      surface.flush();

      firePointerEvent(canvas, "pointerdown", 50, 50);
      expect(input.getActivePointerCount()).toBe(1);

      firePointerEvent(canvas, "pointerup", 50, 50);
      expect(input.getActivePointerCount()).toBe(0);

      input.dispose();
      surface.dispose();
    });

    it("bubbles pointer down to parent when child rejects", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const parentSpy = vi.fn(() => true);
      root.onPointerDown = parentSpy;
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      root.addChild(child);
      root.computeLayout();
      surface.flush();

      firePointerEvent(canvas, "pointerdown", 50, 50);
      expect(parentSpy).toHaveBeenCalled();
      input.dispose();
      surface.dispose();
    });

    it("dispatches pointer move to captured widget", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const moveSpy = vi.fn();
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      child.onPointerDown = () => true;
      child.onPointerMove = moveSpy;
      root.addChild(child);
      root.computeLayout();
      surface.flush();

      firePointerEvent(canvas, "pointerdown", 50, 50);
      firePointerEvent(canvas, "pointermove", 60, 60);
      expect(moveSpy).toHaveBeenCalled();

      input.dispose();
      surface.dispose();
    });

    it("focuses a focusable widget on pointer down", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      child.focusable = true;
      child.onPointerDown = () => true;
      root.addChild(child);
      root.computeLayout();
      surface.flush();

      firePointerEvent(canvas, "pointerdown", 50, 50);
      expect(child.focused).toBe(true);

      input.dispose();
      surface.dispose();
    });
  });

  describe("pointer cancel", () => {
    it("releases the active pointer", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      child.onPointerDown = () => true;
      root.addChild(child);
      root.computeLayout();
      surface.flush();

      firePointerEvent(canvas, "pointerdown", 50, 50);
      expect(input.getActivePointerCount()).toBe(1);
      firePointerEvent(canvas, "pointercancel", 50, 50);
      expect(input.getActivePointerCount()).toBe(0);

      input.dispose();
      surface.dispose();
    });
  });

  describe("hover chain", () => {
    it("calls onPointerEnter when hovering a widget", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const enterSpy = vi.fn();
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      child.onPointerEnter = enterSpy;
      root.addChild(child);
      root.computeLayout();
      surface.flush();

      firePointerEvent(canvas, "pointermove", 50, 50);
      expect(enterSpy).toHaveBeenCalled();

      input.dispose();
      surface.dispose();
    });

    it("calls onPointerLeave when pointer leaves a widget", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const leaveSpy = vi.fn();
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      child.onPointerLeave = leaveSpy;
      root.addChild(child);
      root.computeLayout();
      surface.flush();

      firePointerEvent(canvas, "pointermove", 50, 50);
      firePointerEvent(canvas, "pointermove", 200, 200);
      expect(leaveSpy).toHaveBeenCalled();

      input.dispose();
      surface.dispose();
    });

    it("clears hover chain on pointer leave from canvas", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const leaveSpy = vi.fn();
      root.onPointerLeave = leaveSpy;

      firePointerEvent(canvas, "pointermove", 50, 50);
      canvas.dispatchEvent(new Event("pointerleave"));
      expect(leaveSpy).toHaveBeenCalled();

      input.dispose();
      surface.dispose();
    });
  });

  describe("wheel", () => {
    it("dispatches wheel events and bubbles up", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const wheelSpy = vi.fn(() => true);
      root.onWheel = wheelSpy;
      surface.flush();

      canvas.dispatchEvent(
        new WheelEvent("wheel", {
          clientX: 50,
          clientY: 50,
          deltaX: 0,
          deltaY: 100,
          bubbles: true,
          cancelable: true
        })
      );
      expect(wheelSpy).toHaveBeenCalledWith(0, 100);

      input.dispose();
      surface.dispose();
    });
  });

  describe("keyboard", () => {
    it("dispatches keydown to focused widget", () => {
      const { input, surface, canvas } = createInputSystem();
      const w = new Widget();
      w.focusable = true;
      const keyDownSpy = vi.fn(() => true);
      w.onKeyDown = keyDownSpy;
      input.setFocus(w);

      canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "a", code: "KeyA", bubbles: true }));
      expect(keyDownSpy).toHaveBeenCalled();

      input.dispose();
      surface.dispose();
    });

    it("dispatches keyup to focused widget", () => {
      const { input, surface, canvas } = createInputSystem();
      const w = new Widget();
      w.focusable = true;
      const keyUpSpy = vi.fn();
      w.onKeyUp = keyUpSpy;
      input.setFocus(w);

      canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "a", code: "KeyA", bubbles: true }));
      expect(keyUpSpy).toHaveBeenCalledWith("a", "KeyA");

      input.dispose();
      surface.dispose();
    });

    it("bubbles keydown up the parent chain", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const child = new Widget();
      child.focusable = true;
      child.onKeyDown = () => false;
      const rootKeySpy = vi.fn(() => true);
      root.onKeyDown = rootKeySpy;
      root.addChild(child);
      input.setFocus(child);

      canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "b", code: "KeyB", bubbles: true }));
      expect(rootKeySpy).toHaveBeenCalled();

      input.dispose();
      surface.dispose();
    });
  });

  describe("dispose", () => {
    it("resets active pointer count", () => {
      const { input, surface, canvas, root } = createInputSystem();
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      child.onPointerDown = () => true;
      root.addChild(child);
      root.computeLayout();
      surface.flush();

      firePointerEvent(canvas, "pointerdown", 50, 50);
      expect(input.getActivePointerCount()).toBe(1);
      input.dispose();
      expect(input.getActivePointerCount()).toBe(0);
      surface.dispose();
    });
  });
});
