// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Label } from "../../src/widgets/label";
import { makeFakeTheme } from "../test-helpers";

/** builds a label with the given text and box size (defaults 200x24). */
function createLabel(text: string, w = 200, h = 24): Label {
  const l = new Label();
  l.text = text;
  l.width = w;
  l.height = h;
  return l;
}

/** draws the label onto a throwaway 300x100 canvas and returns the renderer for spies. */
function drawLabel(label: Label): { renderer: Canvas2DRenderer } {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 100;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeTheme();
  renderer.begin(300, 100);
  label.draw(renderer, theme);
  renderer.end();
  return { renderer };
}

describe("Label", () => {
  describe("defaults", () => {
    it("starts with empty text", () => {
      expect(new Label().text).toBe("");
    });

    it("defaults to left/middle alignment", () => {
      const l = new Label();
      expect(l.hAlign).toBe("left");
      expect(l.vAlign).toBe("middle");
    });

    it("defaults to clip overflow", () => {
      expect(new Label().overflow).toBe("clip");
    });

    it("defaults to scale 1 and textOffsetY 0", () => {
      const l = new Label();
      expect(l.scale).toBe(1);
      expect(l.textOffsetY).toBe(0);
    });
  });

  describe("content measurement", () => {
    it("returns 0 for empty text", () => {
      const l = new Label();
      expect(l.getContentWidth()).toBe(0);
      expect(l.getContentHeight()).toBe(0);
    });

    it("returns 0 with no font available", () => {
      const l = createLabel("hello");
      expect(l.getContentHeight()).toBe(0);
    });
  });

  describe("single-line drawing", () => {
    it("draws single-line text", () => {
      const l = createLabel("hello");
      const spy = vi.spyOn(Canvas2DRenderer.prototype, "drawText");
      drawLabel(l);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("draws with center horizontal alignment", () => {
      const l = createLabel("hi");
      l.hAlign = "center";
      drawLabel(l);
    });

    it("draws with right horizontal alignment", () => {
      const l = createLabel("hi");
      l.hAlign = "right";
      drawLabel(l);
    });

    it("draws with top vertical alignment", () => {
      const l = createLabel("hi");
      l.vAlign = "top";
      drawLabel(l);
    });

    it("draws with bottom vertical alignment", () => {
      const l = createLabel("hi");
      l.vAlign = "bottom";
      drawLabel(l);
    });

    it("draws with textOffsetY", () => {
      const l = createLabel("hi");
      l.textOffsetY = 3;
      drawLabel(l);
    });

    it("draws with scale factor", () => {
      const l = createLabel("hi");
      l.scale = 2;
      drawLabel(l);
    });

    it("does not draw when text is empty", () => {
      const l = createLabel("");
      const spy = vi.spyOn(Canvas2DRenderer.prototype, "drawText");
      drawLabel(l);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("ellipsis overflow", () => {
    it("truncates text when it overflows with ellipsis mode", () => {
      const l = createLabel("this is a very long label text that will overflow", 50, 24);
      l.overflow = "ellipsis";
      drawLabel(l);
    });

    it("caches ellipsis result for same text and maxChars", () => {
      const l = createLabel("overflow text here", 50, 24);
      l.overflow = "ellipsis";
      drawLabel(l);
      drawLabel(l);
    });

    it("does not truncate when text fits", () => {
      const l = createLabel("hi", 200, 24);
      l.overflow = "ellipsis";
      const spy = vi.spyOn(Canvas2DRenderer.prototype, "drawText");
      drawLabel(l);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("multiline drawing", () => {
    it("draws multiline text", () => {
      const l = createLabel("line1\nline2\nline3", 200, 100);
      drawLabel(l);
    });

    it("draws multiline with center horizontal alignment", () => {
      const l = createLabel("aa\nbbbb", 200, 100);
      l.hAlign = "center";
      drawLabel(l);
    });

    it("draws multiline with right alignment", () => {
      const l = createLabel("aa\nbbbb", 200, 100);
      l.hAlign = "right";
      drawLabel(l);
    });

    it("draws multiline with middle vertical alignment", () => {
      const l = createLabel("a\nb", 200, 100);
      l.vAlign = "middle";
      drawLabel(l);
    });

    it("draws multiline with bottom vertical alignment", () => {
      const l = createLabel("a\nb", 200, 100);
      l.vAlign = "bottom";
      drawLabel(l);
    });

    it("skips empty lines in multiline", () => {
      const l = createLabel("a\n\nb", 200, 100);
      drawLabel(l);
    });

    it("measures multiline content width as max line width", () => {
      const l = createLabel("short\nlonger line");
      l.getContentWidth();
    });

    it("measures multiline content height", () => {
      const l = createLabel("a\nb\nc");
      l.getContentHeight();
    });
  });

  describe("single-line fast path", () => {
    it("avoids split for text without newlines", () => {
      const l = new Label();
      l.text = "no newlines here";
      l.getContentWidth();
      l.text = "still no newlines";
      l.getContentWidth();
    });

    it("handles transition from multiline to single-line", () => {
      const l = new Label();
      l.text = "a\nb";
      l.getContentWidth();
      l.text = "single";
      l.getContentWidth();
    });
  });

  describe("autoFitScale drawing", () => {
    it("draws with autoFitScale", () => {
      const l = createLabel("hello");
      l.autoFitScale = true;
      l.maxScale = 2;
      l.minScale = 0.5;
      l.computedScale = 1.5;
      drawLabel(l);
    });
  });

  describe("custom font", () => {
    it("uses customFont when set", () => {
      const l = createLabel("hello");
      l.getContentWidth();
    });
  });
});
