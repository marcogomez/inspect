// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Label } from "../../src/widgets/label";
import { makeFakeTheme } from "../test-helpers";

describe("Label single-line content measurement with font", () => {
  it("getContentWidth returns text length * charWidth for single line", () => {
    const label = new Label();
    label.text = "Hello";
    label.customFont = makeFakeTheme().fontAtlas;
    const w = label.getContentWidth();
    expect(w).toBe(5 * 7);
  });

  it("getContentHeight returns lineHeight for single line", () => {
    const label = new Label();
    label.text = "Hello";
    label.customFont = makeFakeTheme().fontAtlas;
    const h = label.getContentHeight();
    expect(h).toBe(14);
  });
});

describe("Label drawSelf with no text", () => {
  it("does not draw when text is empty", () => {
    const label = new Label();
    label.text = "";
    label.width = 100;
    label.height = 20;
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 20;
    const renderer = new Canvas2DRenderer(canvas);
    renderer.begin(100, 20);
    label.draw(renderer, makeFakeTheme());
    renderer.end();
  });
});
