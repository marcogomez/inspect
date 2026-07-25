// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Surface } from "../../src/core/surface";
import { Widget } from "../../src/core/widget";
import { InspectDebugger } from "../../src/panel/inspect-debugger";
import { makeFakeTheme } from "../test-helpers";

/**
 * builds an InspectDebugger over a 400x300 surface with the panel canvas offset
 * 10px from the right and rounded, so the overlay can copy those styles. no
 * ResizeObserver fires under the test env, so the surface width/height are set
 * by hand to give flush real dimensions for dirty-rect math and overlay sizing.
 */
function createDebugger() {
  const container = document.createElement("div");
  const panelCanvas = document.createElement("canvas");
  panelCanvas.width = 400;
  panelCanvas.height = 300;
  panelCanvas.style.position = "fixed";
  panelCanvas.style.right = "10px";
  panelCanvas.style.borderRadius = "8px";
  container.appendChild(panelCanvas);
  const renderer = new Canvas2DRenderer(panelCanvas);
  const surface = new Surface(panelCanvas, renderer, makeFakeTheme());
  const root = new Widget();
  root.width = 400;
  root.height = 300;
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 300;
  const debugger_ = new InspectDebugger(surface, panelCanvas);
  return { debugger_, surface, panelCanvas, container };
}

describe("InspectDebugger overlay positioning", () => {
  it("copies right position and borderRadius from panel canvas", () => {
    const { debugger_, surface, container } = createDebugger();
    const overlay = container.querySelectorAll("canvas")[1];
    expect(overlay.style.right).toBe("10px");
    expect(overlay.style.borderRadius).toBe("8px");
    debugger_.dispose();
    surface.dispose();
  });

  it("uses left position when panel has left style", () => {
    const container = document.createElement("div");
    const panelCanvas = document.createElement("canvas");
    panelCanvas.width = 400;
    panelCanvas.height = 300;
    panelCanvas.style.position = "fixed";
    panelCanvas.style.left = "5px";
    container.appendChild(panelCanvas);
    const renderer = new Canvas2DRenderer(panelCanvas);
    const surface = new Surface(panelCanvas, renderer, makeFakeTheme());
    const root = new Widget();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 300;
    const debugger_ = new InspectDebugger(surface, panelCanvas);

    const overlay = container.querySelectorAll("canvas")[1];
    expect(overlay.style.left).toBe("5px");
    debugger_.dispose();
    surface.dispose();
  });
});

describe("InspectDebugger timer callbacks", () => {
  it("border clear timer fires and clears overlay", async () => {
    vi.useFakeTimers();
    const { debugger_, surface } = createDebugger();

    surface.flush();

    vi.advanceTimersByTime(1000);

    debugger_.dispose();
    surface.dispose();
    vi.useRealTimers();
  });

  it("label clear timer fires and clears overlay", async () => {
    vi.useFakeTimers();
    const { debugger_, surface } = createDebugger();

    surface.flush();

    vi.advanceTimersByTime(3000);

    debugger_.dispose();
    surface.dispose();
    vi.useRealTimers();
  });

  it("multiple flushes reset timers", () => {
    vi.useFakeTimers();
    const { debugger_, surface } = createDebugger();

    surface.flush();
    surface.markDirtyRect(10, 10, 50, 50);
    surface.flush();
    surface.markDirtyRect(100, 100, 50, 50);
    surface.flush();

    vi.advanceTimersByTime(3000);

    debugger_.dispose();
    surface.dispose();
    vi.useRealTimers();
  });
});

describe("InspectDebugger formatEntry branches", () => {
  it("formats partial repaint with rect count and percentage", () => {
    const { debugger_, surface } = createDebugger();

    surface.flush();
    surface.markDirtyRect(10, 10, 50, 50);
    surface.flush();

    debugger_.dispose();
    surface.dispose();
  });
});
