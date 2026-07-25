// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { InputDispatcher } from "../../src/core/input";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { Box } from "../../src/widgets/box";
import { Button } from "../../src/widgets/button";
import { makeFakeTheme } from "../test-helpers";

/**
 * regression coverage for a panel that stopped responding to clicks until the
 * window was resized.
 *
 * InputDispatcher maps client coordinates to canvas-local ones through the
 * canvas screen rect from getBoundingClientRect. getRect caches that rect keyed
 * to surface.frameId so the hot pointermove and wheel path avoids a
 * layout-forcing measure, and frameId only advances when the canvas content
 * repaints. The panel canvas is position: fixed and slides in and out with a
 * CSS transition, which moves it on screen without repainting its content and
 * without firing the ResizeObserver, so a rect cached against frameId can go
 * stale and route every hit test to the wrong place. The fix forces a fresh
 * rect read at pointerdown, so a click still lands on the widget under it even
 * when nothing has repainted.
 *
 * the first test drives a click after the canvas moves with no repaint and
 * checks it still captures the button. the second checks that a repaint (what a
 * window resize triggers) also refreshes the cache.
 */

/**
 * builds a surface whose on-screen position can be changed at runtime (via the
 * returned setScreenPosition) without triggering a repaint, with a small
 * fixed-size button pinned to the top-left. the button is fixed-width so a
 * horizontal shift moves it out from under a fixed cursor location; a
 * full-width button would be hit regardless of the shift.
 */
function createMovableCanvasTree() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;

  // start with the canvas at screen origin; tests mutate this to "move" it
  let rect = { left: 0, top: 0 };
  const setScreenPosition = (left: number, top: number): void => {
    rect = { left, top };
  };
  canvas.getBoundingClientRect = () =>
    ({
      left: rect.left,
      top: rect.top,
      right: rect.left + 400,
      bottom: rect.top + 300,
      width: 400,
      height: 300,
      x: rect.left,
      y: rect.top,
      toJSON: () => {
        /* no-op */
      }
    }) as DOMRect;

  const renderer = new Canvas2DRenderer(canvas);
  const surface = new Surface(canvas, renderer, makeFakeTheme());
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 300;

  const root = new Box();
  root.width = 400;
  root.height = 300;
  // cross-axis "start" keeps the fixed-width button pinned to the left edge
  root.layout = new StackLayout("vertical", 0, "start", "start");
  surface.setRoot(root);

  const btn = new Button();
  btn.text = "Click";
  btn.sizingX = "fixed";
  btn.preferredWidth = 100;
  btn.sizingY = "fixed";
  btn.preferredHeight = 30;
  btn.onClick = vi.fn();
  root.addChild(btn);

  root.needsLayout = true;
  root.computeLayout();
  surface.flush(); // first repaint: frameId becomes 1, button occupies local (0,0)-(100,30)

  const input = new InputDispatcher(surface);
  return { canvas, surface, root, btn, input, setScreenPosition };
}

/** dispatches a pointerdown at the given client coordinates. */
function pointerDown(canvas: HTMLCanvasElement, clientX: number, clientY: number): void {
  canvas.dispatchEvent(new PointerEvent("pointerdown", { clientX, clientY, pointerId: 1, button: 0, bubbles: true }));
}

/** dispatches a pointerup at the given client coordinates. */
function pointerUp(canvas: HTMLCanvasElement, clientX: number, clientY: number): void {
  canvas.dispatchEvent(new PointerEvent("pointerup", { clientX, clientY, pointerId: 1, button: 0, bubbles: true }));
}

describe("InputDispatcher rect-cache staleness (stuck-panel regression)", () => {
  it("routes a click to a control at its CURRENT screen position after the canvas moves without a repaint", () => {
    const { canvas, surface, input, setScreenPosition } = createMovableCanvasTree();

    // sanity: at rest (canvas left=0) a click on the button hits and captures.
    // this also primes getRect()'s cache with left=0 at the current frameId.
    pointerDown(canvas, 50, 15);
    expect(input.getActivePointerCount()).toBe(1);
    pointerUp(canvas, 50, 15);
    expect(input.getActivePointerCount()).toBe(0);

    const frameBefore = surface.frameId;

    // the panel slides 200px to the right via CSS transition: the canvas moves
    // on screen, but nothing repaints its content (frameId stays put) and the
    // ResizeObserver does not fire (size is unchanged).
    setScreenPosition(200, 0);
    expect(surface.frameId).toBe(frameBefore); // no repaint happened

    // the button now lives at screen x 200..300, y 0..30. A click at its real
    // on-screen location must still route to it.
    pointerDown(canvas, 250, 15);

    // pointerdown forces a fresh rect read, so getRect() returns the current
    // left=200 rect: localX becomes 50, lands on the 0..100 button, and captures.
    expect(input.getActivePointerCount()).toBe(1);

    surface.dispose();
  });

  it("recovers once any repaint advances frameId (what a window resize does)", () => {
    const { canvas, surface, input, setScreenPosition } = createMovableCanvasTree();

    pointerDown(canvas, 50, 15); // prime the cache at left=0
    pointerUp(canvas, 50, 15);

    setScreenPosition(200, 0);

    // markDirty then flush forces a full repaint and advances frameId, which is
    // what a window resize does and what invalidates the cached rect.
    surface.markDirty();
    surface.flush();

    pointerDown(canvas, 250, 15);
    expect(input.getActivePointerCount()).toBe(1); // unstuck
    pointerUp(canvas, 250, 15);

    surface.dispose();
  });
});
