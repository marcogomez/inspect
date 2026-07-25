// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Box } from "../../src/widgets/box";
import { makeFakeTheme } from "../test-helpers";

import type { Theme } from "../../src/core/theme";

/** creates a 200x200 canvas renderer paired with the fake theme for draw assertions. */
function createRendererAndTheme(): { renderer: Canvas2DRenderer; theme: Theme; canvas: HTMLCanvasElement } {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  return { renderer: new Canvas2DRenderer(canvas), theme: makeFakeTheme(), canvas };
}

describe("Box", () => {
  describe("defaults", () => {
    it("starts with all colors at 0 (transparent)", () => {
      const box = new Box();
      expect(box.bgColor).toBe(0);
      expect(box.borderColor).toBe(0);
      expect(box.borderWidth).toBe(0);
      expect(box.borderRadius).toBe(0);
      expect(box.borderTopColor).toBe(0);
      expect(box.borderBottomColor).toBe(0);
      expect(box.borderLeftColor).toBe(0);
      expect(box.borderRightColor).toBe(0);
    });
  });

  describe("drawSelf", () => {
    it("draws nothing when bgColor is 0", () => {
      const { renderer, theme } = createRendererAndTheme();
      const box = new Box();
      box.width = 100;
      box.height = 100;
      const fillRectSpy = vi.spyOn(renderer, "fillRect");
      const fillRoundedSpy = vi.spyOn(renderer, "fillRoundedRect");
      renderer.begin(200, 200);
      box.draw(renderer, theme);
      renderer.end();
      expect(fillRectSpy).not.toHaveBeenCalled();
      expect(fillRoundedSpy).not.toHaveBeenCalled();
    });

    it("draws a flat rect when bgColor is set and borderRadius is 0", () => {
      const { renderer, theme } = createRendererAndTheme();
      const box = new Box();
      box.width = 100;
      box.height = 100;
      box.bgColor = 0xff0000ff;
      const fillRectSpy = vi.spyOn(renderer, "fillRect");
      renderer.begin(200, 200);
      box.draw(renderer, theme);
      renderer.end();
      expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 100, 100, 0xff0000ff);
    });

    it("draws a rounded rect when borderRadius > 0", () => {
      const { renderer, theme } = createRendererAndTheme();
      const box = new Box();
      box.width = 100;
      box.height = 100;
      box.bgColor = 0xff0000ff;
      box.borderRadius = 5;
      const fillRoundedSpy = vi.spyOn(renderer, "fillRoundedRect");
      renderer.begin(200, 200);
      box.draw(renderer, theme);
      renderer.end();
      expect(fillRoundedSpy).toHaveBeenCalledWith(0, 0, 100, 100, 5, 0xff0000ff);
    });

    it("draws border when borderColor and borderWidth are set", () => {
      const { renderer, theme } = createRendererAndTheme();
      const box = new Box();
      box.width = 100;
      box.height = 100;
      box.borderColor = 0x00ff00ff;
      box.borderWidth = 2;
      const strokeRectSpy = vi.spyOn(renderer, "strokeRect");
      renderer.begin(200, 200);
      box.draw(renderer, theme);
      renderer.end();
      expect(strokeRectSpy).toHaveBeenCalledWith(0, 0, 100, 100, 0x00ff00ff, 2);
    });

    it("draws rounded border when borderRadius > 0", () => {
      const { renderer, theme } = createRendererAndTheme();
      const box = new Box();
      box.width = 100;
      box.height = 100;
      box.borderColor = 0x00ff00ff;
      box.borderWidth = 2;
      box.borderRadius = 5;
      const strokeRoundedSpy = vi.spyOn(renderer, "strokeRoundedRect");
      renderer.begin(200, 200);
      box.draw(renderer, theme);
      renderer.end();
      expect(strokeRoundedSpy).toHaveBeenCalledWith(0, 0, 100, 100, 5, 0x00ff00ff, 2);
    });

    it("does not draw border when borderWidth is 0", () => {
      const { renderer, theme } = createRendererAndTheme();
      const box = new Box();
      box.width = 100;
      box.height = 100;
      box.borderColor = 0x00ff00ff;
      box.borderWidth = 0;
      const strokeRectSpy = vi.spyOn(renderer, "strokeRect");
      renderer.begin(200, 200);
      box.draw(renderer, theme);
      renderer.end();
      expect(strokeRectSpy).not.toHaveBeenCalled();
    });

    it("draws individual side borders", () => {
      const { renderer, theme } = createRendererAndTheme();
      const box = new Box();
      box.width = 100;
      box.height = 100;
      box.borderTopColor = 0xff0000ff;
      box.borderBottomColor = 0x00ff00ff;
      box.borderLeftColor = 0x0000ffff;
      box.borderRightColor = 0xffff00ff;
      const fillRectSpy = vi.spyOn(renderer, "fillRect");
      renderer.begin(200, 200);
      box.draw(renderer, theme);
      renderer.end();
      expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 100, 1, 0xff0000ff);
      expect(fillRectSpy).toHaveBeenCalledWith(0, 99, 100, 1, 0x00ff00ff);
      expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 1, 100, 0x0000ffff);
      expect(fillRectSpy).toHaveBeenCalledWith(99, 0, 1, 100, 0xffff00ff);
    });

    it("does not draw side border when color is 0", () => {
      const { renderer, theme } = createRendererAndTheme();
      const box = new Box();
      box.width = 100;
      box.height = 100;
      box.borderTopColor = 0xff0000ff;
      const fillRectSpy = vi.spyOn(renderer, "fillRect");
      renderer.begin(200, 200);
      box.draw(renderer, theme);
      renderer.end();
      expect(fillRectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
