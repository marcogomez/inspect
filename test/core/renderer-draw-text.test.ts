// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { createFontAtlas } from "../../src/core/font-generator";

describe("Canvas2DRenderer drawText", () => {
  it("draws extra chars outside contiguous range", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14,
      extraChars: "‹›"
    });

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 30;
    const renderer = new Canvas2DRenderer(canvas);
    renderer.begin(200, 30);
    renderer.drawText(atlas, "A‹B›C", 0, 0, 0xffffffff);
    renderer.end();
  });

  it("draws with scale and letterSpacing", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14
    });

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 30;
    const renderer = new Canvas2DRenderer(canvas);
    renderer.begin(200, 30);
    renderer.drawText(atlas, "Hello", 0, 0, 0xff0000ff, 2, 1);
    renderer.end();
  });

  it("tint cache evicts when exceeding 16 entries", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14
    });

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 30;
    const renderer = new Canvas2DRenderer(canvas);
    renderer.begin(200, 30);

    for (let i = 0; i < 20; i++) {
      const color = ((i * 15) << 24) | ((i * 10) << 16) | ((i * 5) << 8) | 0xff;
      renderer.drawText(atlas, "X", 0, 0, color >>> 0);
    }

    renderer.end();
  });
});

describe("Canvas2DRenderer pushScale/popScale", () => {
  it("scales context", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const renderer = new Canvas2DRenderer(canvas);
    renderer.begin(200, 200);
    renderer.pushScale(2, 2);
    renderer.fillRect(0, 0, 50, 50, 0xff0000ff);
    renderer.popScale();
    renderer.end();
  });
});
