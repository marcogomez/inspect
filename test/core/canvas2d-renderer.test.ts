// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";

/** creates a Canvas2DRenderer over a fresh w by h canvas, returning it with the canvas and its 2d context. */
function createRenderer(
  w = 200,
  h = 200
): { renderer: Canvas2DRenderer; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const renderer = new Canvas2DRenderer(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context unavailable");
  }
  return { renderer, canvas, ctx };
}

describe("Canvas2DRenderer", () => {
  describe("construction", () => {
    it("creates successfully with a valid canvas", () => {
      const { renderer } = createRenderer();
      expect(renderer).toBeDefined();
    });
  });

  describe("begin / end", () => {
    it("begin clears the canvas", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, 100, 100);
      renderer.begin(100, 100);
      const pixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(pixel[3]).toBe(0);
      renderer.end();
    });

    it("beginPartial clears only the specified region", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, 100, 100);
      renderer.beginPartial(10, 10, 20, 20);
      const clearedPixel = ctx.getImageData(15, 15, 1, 1).data;
      expect(clearedPixel[3]).toBe(0);
      renderer.end();
      const outsidePixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(outsidePixel[0]).toBe(255);
    });
  });

  describe("fillRect", () => {
    it("fills a rectangle with the given color", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.fillRect(0, 0, 50, 50, 0xff0000ff);
      renderer.end();
      const pixel = ctx.getImageData(25, 25, 1, 1).data;
      expect(pixel[0]).toBe(255);
      expect(pixel[1]).toBe(0);
      expect(pixel[2]).toBe(0);
      expect(pixel[3]).toBe(255);
    });
  });

  describe("fillRoundedRect", () => {
    it("fills a rounded rectangle", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.fillRoundedRect(10, 10, 80, 80, 5, 0x00ff00ff);
      renderer.end();
      const pixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(pixel[1]).toBe(255);
    });

    it("returns early for zero-width rect", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.fillRoundedRect(10, 10, 0, 50, 5, 0xff0000ff);
      renderer.end();
      const pixel = ctx.getImageData(10, 35, 1, 1).data;
      expect(pixel[3]).toBe(0);
    });

    it("returns early for negative dimensions", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.fillRoundedRect(10, 10, -5, 50, 5, 0xff0000ff);
      renderer.end();
      const pixel = ctx.getImageData(10, 35, 1, 1).data;
      expect(pixel[3]).toBe(0);
    });

    it("clamps radius to half the smallest dimension", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.fillRoundedRect(10, 10, 20, 10, 100, 0x0000ffff);
      renderer.end();
      const pixel = ctx.getImageData(20, 15, 1, 1).data;
      expect(pixel[2]).toBe(255);
    });
  });

  describe("strokeRect", () => {
    it("strokes a rectangle outline", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.strokeRect(10, 10, 80, 80, 0xff0000ff, 2);
      renderer.end();
      const edgePixel = ctx.getImageData(10, 10, 1, 1).data;
      expect(edgePixel[0]).toBe(255);
      const centerPixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(centerPixel[3]).toBe(0);
    });
  });

  describe("strokeRoundedRect", () => {
    it("returns early for zero dimensions", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.strokeRoundedRect(10, 10, 0, 50, 5, 0xff0000ff, 1);
      renderer.end();
      const pixel = ctx.getImageData(10, 35, 1, 1).data;
      expect(pixel[3]).toBe(0);
    });
  });

  describe("drawLine", () => {
    it("draws a line between two points", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.drawLine(10, 50, 90, 50, 0xff0000ff, 2);
      renderer.end();
      const pixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(pixel[0]).toBe(255);
    });
  });

  describe("fillCircle", () => {
    it("fills a circle at the given center", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.fillCircle(50, 50, 20, 0x00ff00ff);
      renderer.end();
      const pixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(pixel[1]).toBe(255);
    });
  });

  describe("strokeCircle", () => {
    it("strokes a circle outline", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.strokeCircle(50, 50, 30, 0x0000ffff, 2);
      renderer.end();
      const edgePixel = ctx.getImageData(80, 50, 1, 1).data;
      expect(edgePixel[2]).toBe(255);
      const centerPixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(centerPixel[3]).toBe(0);
    });
  });

  describe("strokeArc", () => {
    it("draws an arc segment", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.strokeArc(50, 50, 30, 0, Math.PI, 0xff0000ff, 2, "round");
      renderer.end();
      const pixel = ctx.getImageData(80, 50, 1, 1).data;
      expect(pixel[0]).toBe(255);
    });
  });

  describe("path operations", () => {
    it("beginPath + moveTo + lineTo + strokePath draws a path", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.beginPath();
      renderer.moveTo(10, 10);
      renderer.lineTo(90, 10);
      renderer.lineTo(90, 90);
      renderer.strokePath(0xff0000ff, 2);
      renderer.end();
      const pixel = ctx.getImageData(90, 50, 1, 1).data;
      expect(pixel[0]).toBe(255);
    });

    it("fillPath fills the current path", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.beginPath();
      renderer.moveTo(10, 10);
      renderer.lineTo(90, 10);
      renderer.lineTo(50, 90);
      renderer.fillPath(0x00ff00ff);
      renderer.end();
      const pixel = ctx.getImageData(50, 30, 1, 1).data;
      expect(pixel[1]).toBe(255);
    });
  });

  describe("pushClip / popClip", () => {
    it("clips rendering to the specified region", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.pushClip(20, 20, 30, 30);
      renderer.fillRect(0, 0, 100, 100, 0xff0000ff);
      renderer.popClip();
      renderer.end();
      const insidePixel = ctx.getImageData(35, 35, 1, 1).data;
      expect(insidePixel[0]).toBe(255);
      const outsidePixel = ctx.getImageData(5, 5, 1, 1).data;
      expect(outsidePixel[3]).toBe(0);
    });
  });

  describe("pushTranslateClip / popTranslateClip", () => {
    it("translates and clips in a single operation", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.pushTranslateClip(20, 20, 0, 0, 30, 30);
      renderer.fillRect(0, 0, 100, 100, 0x0000ffff);
      renderer.popTranslateClip();
      renderer.end();
      const insidePixel = ctx.getImageData(35, 35, 1, 1).data;
      expect(insidePixel[2]).toBe(255);
      const outsidePixel = ctx.getImageData(5, 5, 1, 1).data;
      expect(outsidePixel[3]).toBe(0);
    });
  });

  describe("pushAlpha / popAlpha", () => {
    it("applies alpha to subsequent draws", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.pushAlpha(0.5);
      renderer.fillRect(0, 0, 100, 100, 0xff0000ff);
      renderer.popAlpha();
      renderer.end();
      const pixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(pixel[3]).toBeLessThan(200);
      expect(pixel[3]).toBeGreaterThan(50);
    });

    it("nests alpha correctly", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.pushAlpha(0.5);
      renderer.pushAlpha(0.5);
      renderer.fillRect(0, 0, 100, 100, 0xff0000ff);
      renderer.popAlpha();
      renderer.popAlpha();
      renderer.end();
      const pixel = ctx.getImageData(50, 50, 1, 1).data;
      expect(pixel[3]).toBeLessThan(100);
    });
  });

  describe("pushTranslate / popTranslate", () => {
    it("translates subsequent draws", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.pushTranslate(50, 50);
      renderer.fillRect(0, 0, 10, 10, 0xff0000ff);
      renderer.popTranslate();
      renderer.end();
      const translatedPixel = ctx.getImageData(55, 55, 1, 1).data;
      expect(translatedPixel[0]).toBe(255);
      const originPixel = ctx.getImageData(5, 5, 1, 1).data;
      expect(originPixel[3]).toBe(0);
    });
  });

  describe("pushScale / popScale", () => {
    it("scales subsequent draws", () => {
      const { renderer, ctx } = createRenderer(100, 100);
      renderer.begin(100, 100);
      renderer.pushScale(2, 2);
      renderer.fillRect(0, 0, 10, 10, 0xff0000ff);
      renderer.popScale();
      renderer.end();
      const scaledPixel = ctx.getImageData(15, 15, 1, 1).data;
      expect(scaledPixel[0]).toBe(255);
    });
  });

  describe("dispose", () => {
    it("clears caches without throwing", () => {
      const { renderer } = createRenderer();
      renderer.fillRect(0, 0, 10, 10, 0xff0000ff);
      renderer.fillRect(0, 0, 10, 10, 0x00ff00ff);
      renderer.dispose();
    });
  });
});
