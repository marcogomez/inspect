// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Surface } from "../../src/core/surface";
import { makeFakeTheme } from "../test-helpers";

describe("Surface mergeOverlapping changedIndex decrement", () => {
  it("decrements changedIndex when merged rect index is lower", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const renderer = new Canvas2DRenderer(canvas);
    const surface = new Surface(canvas, renderer, makeFakeTheme());
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 300;
    (surface as unknown as { fullRepaint: boolean }).fullRepaint = false;

    surface.markDirtyRect(10, 10, 20, 20);
    surface.markDirtyRect(200, 200, 20, 20);
    surface.markDirtyRect(100, 100, 20, 20);
    surface.markDirtyRect(5, 5, 300, 300);
    expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(1);
    surface.dispose();
  });
});

describe("Surface width/height getters", () => {
  it("returns stored width and height", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const renderer = new Canvas2DRenderer(canvas);
    const surface = new Surface(canvas, renderer, makeFakeTheme());
    (surface as unknown as { _width: number })._width = 800;
    (surface as unknown as { _height: number })._height = 600;
    expect(surface.width).toBe(800);
    expect(surface.height).toBe(600);
    surface.dispose();
  });
});
