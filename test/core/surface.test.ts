// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Surface } from "../../src/core/surface";
import { Widget } from "../../src/core/widget";
import { makeFakeTheme } from "../test-helpers";

import type { FlushInfo } from "../../src/core/surface";

/** creates a 400x300 surface with a fake theme, returning it with the canvas and renderer. */
function createSurface(): { surface: Surface; canvas: HTMLCanvasElement; renderer: Canvas2DRenderer } {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeTheme();
  const surface = new Surface(canvas, renderer, theme);
  return { surface, canvas, renderer };
}

describe("Surface", () => {
  describe("construction", () => {
    it("stores canvas and renderer references", () => {
      const { surface, canvas, renderer } = createSurface();
      expect(surface.canvas).toBe(canvas);
      expect(surface.renderer).toBe(renderer);
      surface.dispose();
    });

    it("starts with no root", () => {
      const { surface } = createSurface();
      expect(surface.getRoot()).toBeNull();
      surface.dispose();
    });

    it("starts at frameId 0", () => {
      const { surface } = createSurface();
      expect(surface.frameId).toBe(0);
      surface.dispose();
    });
  });

  describe("setRoot", () => {
    it("sets the root widget and assigns surface to it", () => {
      const { surface } = createSurface();
      const root = new Widget();
      surface.setRoot(root);
      expect(surface.getRoot()).toBe(root);
      expect(root.surface).toBe(surface);
      surface.dispose();
    });

    it("clears surface on previous root when setting a new root", () => {
      const { surface } = createSurface();
      const root1 = new Widget();
      const root2 = new Widget();
      surface.setRoot(root1);
      surface.setRoot(root2);
      expect(root1.surface).toBeNull();
      expect(root2.surface).toBe(surface);
      surface.dispose();
    });

    it("sets needsLayout on the root", () => {
      const { surface } = createSurface();
      const root = new Widget();
      root.needsLayout = false;
      surface.setRoot(root);
      expect(root.needsLayout).toBe(true);
      surface.dispose();
    });
  });

  describe("theme", () => {
    it("returns the theme via getTheme", () => {
      const { surface } = createSurface();
      const theme = surface.getTheme();
      expect(theme).toBeDefined();
      expect(theme.bgApp).toBe(0x000000e8);
      surface.dispose();
    });

    it("setTheme updates the theme", () => {
      const { surface } = createSurface();
      const newTheme = makeFakeTheme();
      newTheme.bgApp = 0xff0000ff;
      surface.setTheme(newTheme);
      expect(surface.getTheme().bgApp).toBe(0xff0000ff);
      surface.dispose();
    });
  });

  describe("markDirtyRect", () => {
    it("ignores rects completely outside canvas bounds", () => {
      const { surface } = createSurface();
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      (surface as unknown as { fullRepaint: boolean }).fullRepaint = false;
      surface.markDirtyRect(-100, -100, 50, 50);
      expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(0);
      surface.dispose();
    });

    it("skips markDirtyRect when fullRepaint is already true", () => {
      const { surface } = createSurface();
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      surface.markDirty();
      surface.markDirtyRect(10, 10, 50, 50);
      expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(0);
      surface.dispose();
    });

    it("adds a dirty rect when within bounds", () => {
      const { surface } = createSurface();
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      (surface as unknown as { fullRepaint: boolean }).fullRepaint = false;
      surface.markDirtyRect(10, 10, 50, 50);
      expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(1);
      surface.dispose();
    });

    it("merges overlapping dirty rects", () => {
      const { surface } = createSurface();
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      (surface as unknown as { fullRepaint: boolean }).fullRepaint = false;
      surface.markDirtyRect(10, 10, 50, 50);
      surface.markDirtyRect(40, 40, 50, 50);
      expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(1);
      surface.dispose();
    });

    it("keeps non-overlapping dirty rects separate", () => {
      const { surface } = createSurface();
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      (surface as unknown as { fullRepaint: boolean }).fullRepaint = false;
      surface.markDirtyRect(10, 10, 20, 20);
      surface.markDirtyRect(200, 200, 20, 20);
      expect((surface as unknown as { dirtyRectCount: number }).dirtyRectCount).toBe(2);
      surface.dispose();
    });

    it("falls back to full repaint when exceeding max dirty rects", () => {
      const { surface } = createSurface();
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      (surface as unknown as { fullRepaint: boolean }).fullRepaint = false;
      for (let i = 0; i < 33; i++) {
        surface.markDirtyRect(i * 12, 0, 10, 10);
      }
      expect((surface as unknown as { fullRepaint: boolean }).fullRepaint).toBe(true);
      surface.dispose();
    });
  });

  describe("isRectInDirtyArea", () => {
    it("returns true during full repaint", () => {
      const { surface } = createSurface();
      expect(surface.isRectInDirtyArea(0, 0, 10, 10)).toBe(true);
      surface.dispose();
    });
  });

  describe("flush", () => {
    it("does nothing when no root is set", () => {
      const { surface } = createSurface();
      surface.flush();
      expect(surface.frameId).toBe(0);
      surface.dispose();
    });

    it("increments frameId on each flush that renders", () => {
      const { surface } = createSurface();
      const root = new Widget();
      root.width = 400;
      root.height = 300;
      surface.setRoot(root);
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      surface.flush();
      expect(surface.frameId).toBe(1);
      surface.markDirty();
      surface.flush();
      expect(surface.frameId).toBe(2);
      surface.dispose();
    });

    it("does not increment frameId when flush has nothing to render", () => {
      const { surface } = createSurface();
      const root = new Widget();
      root.width = 400;
      root.height = 300;
      surface.setRoot(root);
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      surface.flush();
      expect(surface.frameId).toBe(1);
      surface.flush();
      expect(surface.frameId).toBe(1);
      surface.dispose();
    });

    it("calls onAfterFlush callback with flush info", () => {
      const { surface } = createSurface();
      const root = new Widget();
      root.width = 400;
      root.height = 300;
      surface.setRoot(root);
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;

      let capturedInfo: FlushInfo | null = null;
      surface.onAfterFlush = (info) => {
        capturedInfo = { ...info };
      };
      surface.flush();

      const info = capturedInfo as FlushInfo | null;
      if (info === null) {
        throw new Error("expected onAfterFlush to capture flush info");
      }
      expect(info.isFullRepaint).toBe(true);
      expect(info.canvasWidth).toBe(400);
      expect(info.canvasHeight).toBe(300);
      expect(info.flushTimeMs).toBeGreaterThanOrEqual(0);
      surface.dispose();
    });

    it("performs partial repaint for dirty rects", () => {
      const { surface, renderer } = createSurface();
      const root = new Widget();
      root.width = 400;
      root.height = 300;
      surface.setRoot(root);
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      surface.flush();

      const beginPartialSpy = vi.spyOn(renderer, "beginPartial");
      surface.markDirtyRect(10, 10, 50, 50);
      surface.flush();
      expect(beginPartialSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      surface.dispose();
    });

    it("sets root dimensions to match canvas on flush", () => {
      const { surface } = createSurface();
      const root = new Widget();
      surface.setRoot(root);
      (surface as unknown as { _width: number })._width = 800;
      (surface as unknown as { _height: number })._height = 600;
      surface.flush();
      expect(root.width).toBe(800);
      expect(root.height).toBe(600);
      surface.dispose();
    });

    it("skips flush when canvas dimensions are zero", () => {
      const { surface } = createSurface();
      const root = new Widget();
      surface.setRoot(root);
      (surface as unknown as { _width: number })._width = 0;
      (surface as unknown as { _height: number })._height = 0;
      surface.flush();
      expect(surface.frameId).toBe(0);
      surface.dispose();
    });

    it("does not flush when no dirty rects and no full repaint", () => {
      const { surface } = createSurface();
      const root = new Widget();
      root.width = 400;
      root.height = 300;
      surface.setRoot(root);
      (surface as unknown as { _width: number })._width = 400;
      (surface as unknown as { _height: number })._height = 300;
      surface.flush();
      const frameAfterFirst = surface.frameId;
      surface.flush();
      expect(surface.frameId).toBe(frameAfterFirst);
      surface.dispose();
    });
  });

  describe("dispose", () => {
    it("clears the root surface reference", () => {
      const { surface } = createSurface();
      const root = new Widget();
      surface.setRoot(root);
      surface.dispose();
      expect(root.surface).toBeNull();
    });
  });
});
