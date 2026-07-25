// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Surface } from "../../src/core/surface";
import { Widget } from "../../src/core/widget";
import { makeFakeTheme } from "../test-helpers";

/** creates a 400x300 surface with its measured size assigned directly, returning it with the canvas and renderer. */
function createSurface() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeTheme();
  const surface = new Surface(canvas, renderer, theme);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 300;
  return { surface, canvas, renderer };
}

describe("Surface mergeOverlapping cascade", () => {
  it("merges three overlapping rects into one via cascade", () => {
    const { surface } = createSurface();
    (surface as unknown as { fullRepaint: boolean }).fullRepaint = false;

    surface.markDirtyRect(10, 10, 30, 30);
    surface.markDirtyRect(100, 10, 30, 30);
    expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(2);

    surface.markDirtyRect(30, 10, 80, 30);
    expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(1);

    surface.dispose();
  });

  it("merges rects when changedIndex is higher than merged rect", () => {
    const { surface } = createSurface();
    (surface as unknown as { fullRepaint: boolean }).fullRepaint = false;

    surface.markDirtyRect(10, 10, 20, 20);
    surface.markDirtyRect(200, 10, 20, 20);
    surface.markDirtyRect(100, 100, 20, 20);
    expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(3);

    surface.markDirtyRect(5, 5, 220, 120);
    expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(1);

    surface.dispose();
  });
});

describe("Surface isRectInDirtyArea with partial rects", () => {
  it("returns true when rect overlaps a dirty rect", () => {
    const { surface } = createSurface();
    const root = new Widget();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);
    surface.flush();

    surface.markDirtyRect(50, 50, 100, 100);
    (surface as unknown as { frameIsFullRepaint: boolean }).frameIsFullRepaint = false;
    (surface as unknown as { frameDirtyRectCount: number }).frameDirtyRectCount = 1;
    const frameDirtyRects = (
      surface as unknown as { frameDirtyRects: { x: number; y: number; width: number; height: number }[] }
    ).frameDirtyRects;
    frameDirtyRects[0] = { x: 50, y: 50, width: 100, height: 100 };

    expect(surface.isRectInDirtyArea(60, 60, 20, 20)).toBe(true);
    expect(surface.isRectInDirtyArea(200, 200, 10, 10)).toBe(false);

    surface.dispose();
  });
});

describe("Surface ResizeObserver", () => {
  it("schedules frame on resize", () => {
    const { surface } = createSurface();
    const root = new Widget();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);
    surface.flush();
    surface.dispose();
  });
});
