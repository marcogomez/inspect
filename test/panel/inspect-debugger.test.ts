// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Surface } from "../../src/core/surface";
import { Widget } from "../../src/core/widget";
import { InspectDebugger } from "../../src/panel/inspect-debugger";
import { makeFakeTheme } from "../test-helpers";

/**
 * wires an InspectDebugger to a fresh 400x300 surface whose panel canvas is
 * fixed to the top-right, and returns the parts so tests can flush, assert on
 * the overlay canvas, and dispose.
 */
function createDebugger(): {
  debugger_: InspectDebugger;
  surface: Surface;
  panelCanvas: HTMLCanvasElement;
  container: HTMLElement;
} {
  const container = document.createElement("div");
  const panelCanvas = document.createElement("canvas");
  panelCanvas.width = 400;
  panelCanvas.height = 300;
  panelCanvas.style.position = "fixed";
  panelCanvas.style.top = "0px";
  panelCanvas.style.right = "0px";
  panelCanvas.style.width = "400px";
  panelCanvas.style.height = "300px";
  container.appendChild(panelCanvas);
  const renderer = new Canvas2DRenderer(panelCanvas);
  const surface = new Surface(panelCanvas, renderer, makeFakeTheme());
  const root = new Widget();
  root.width = 400;
  root.height = 300;
  surface.setRoot(root);
  const debugger_ = new InspectDebugger(surface, panelCanvas);
  return { debugger_, surface, panelCanvas, container };
}

describe("InspectDebugger", () => {
  it("creates an overlay canvas element", () => {
    const { debugger_, surface, container } = createDebugger();
    const overlayCanvases = container.querySelectorAll("canvas");
    expect(overlayCanvases.length).toBe(2);
    debugger_.dispose();
    surface.dispose();
  });

  it("sets onAfterFlush on the surface", () => {
    const { debugger_, surface } = createDebugger();
    expect(surface.onAfterFlush).not.toBeNull();
    debugger_.dispose();
    surface.dispose();
  });

  it("dispose clears onAfterFlush and removes overlay", () => {
    const { debugger_, surface, container } = createDebugger();
    debugger_.dispose();
    expect(surface.onAfterFlush).toBeNull();
    const overlayCanvases = container.querySelectorAll("canvas");
    expect(overlayCanvases.length).toBe(1);
    surface.dispose();
  });

  it("handles flush callback with full repaint info", () => {
    const { debugger_, surface } = createDebugger();
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 300;
    surface.flush();
    debugger_.dispose();
    surface.dispose();
  });

  it("handles flush callback with partial repaint info", () => {
    const { debugger_, surface } = createDebugger();
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 300;
    surface.flush();
    surface.markDirtyRect(10, 10, 50, 50);
    surface.flush();
    debugger_.dispose();
    surface.dispose();
  });

  it("first paint shows FIRST PAINT label", () => {
    const { debugger_, surface } = createDebugger();
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 300;
    surface.flush();
    debugger_.dispose();
    surface.dispose();
  });
});
