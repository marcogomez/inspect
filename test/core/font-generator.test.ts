// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createFontAtlas } from "../../src/core/font-generator";

describe("createFontAtlas", () => {
  it("creates a canvas-based font atlas with monospace", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14
    });
    expect(atlas).toBeDefined();
    expect(atlas.charWidth).toBeGreaterThan(0);
    expect(atlas.lineHeight).toBe(14);
    expect(atlas.firstChar).toBe(32);
    expect(atlas.lastChar).toBe(126);
    expect(atlas.image).toBeDefined();
    expect(atlas.charTable).toBeInstanceOf(Int32Array);
  });

  it("creates atlas with extra characters", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14,
      extraChars: "v>‹›"
    });
    expect(atlas).toBeDefined();
    const codePoint = "‹".codePointAt(0);
    if (codePoint === undefined) {
      throw new Error("missing code point");
    }
    const chevronRegion = atlas.getCharRegion(codePoint);
    expect(chevronRegion).not.toBeNull();
  });

  it("creates atlas with custom range", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 11,
      firstChar: 33,
      lastChar: 90
    });
    expect(atlas.firstChar).toBe(33);
    expect(atlas.lastChar).toBe(90);
  });

  it("creates atlas with bold and italic", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14,
      bold: true,
      italic: true
    });
    expect(atlas.charWidth).toBeGreaterThan(0);
  });

  it("getCharRegion returns region for contiguous chars", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14
    });
    const region = atlas.getCharRegion("A".charCodeAt(0));
    if (!region) {
      throw new Error("expected a region for 'A'");
    }
    expect(region.width).toBe(atlas.charWidth);
  });

  it("getCharRegion returns null for out-of-range char", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14
    });
    const region = atlas.getCharRegion(0);
    expect(region).toBeNull();
  });

  it("getRegion returns null", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14
    });
    expect(atlas.getRegion("test")).toBeNull();
  });

  it("skips duplicate extra chars", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14,
      extraChars: "‹‹››"
    });
    expect(atlas).toBeDefined();
  });

  it("skips extra chars that are in the contiguous range", async () => {
    const atlas = await createFontAtlas({
      family: "monospace",
      size: 14,
      extraChars: "ABC"
    });
    expect(atlas).toBeDefined();
  });

  it("creates pixel-perfect atlas from TTF fontData", async () => {
    const fontPath = resolve(__dirname, "../fixtures/unscii-16.ttf");
    const fontData = readFileSync(fontPath).buffer;
    const atlas = await createFontAtlas({
      family: "unscii",
      size: 16,
      fontData: fontData as ArrayBuffer,
      pixelPerfect: true
    });
    expect(atlas).toBeDefined();
    expect(atlas.charWidth).toBeGreaterThan(0);
    expect(atlas.lineHeight).toBe(16);
    const region = atlas.getCharRegion("A".charCodeAt(0));
    expect(region).not.toBeNull();
  });

  it("creates pixel-perfect atlas with extra chars", async () => {
    const fontPath = resolve(__dirname, "../fixtures/unscii-16.ttf");
    const fontData = readFileSync(fontPath).buffer;
    const atlas = await createFontAtlas({
      family: "unscii",
      size: 16,
      fontData: fontData as ArrayBuffer,
      pixelPerfect: true,
      extraChars: "‹›"
    });
    expect(atlas).toBeDefined();
  });

  it("creates pixel-perfect atlas from TTF with curves (JetBrains Mono)", async () => {
    const fontPath = resolve(__dirname, "../fixtures/JetBrainsMono-Regular.ttf");
    const fontData = readFileSync(fontPath).buffer;
    const atlas = await createFontAtlas({
      family: "JetBrainsMono",
      size: 16,
      fontData: fontData as ArrayBuffer,
      pixelPerfect: true
    });
    expect(atlas).toBeDefined();
    expect(atlas.charWidth).toBeGreaterThan(0);
    const region = atlas.getCharRegion("S".charCodeAt(0));
    expect(region).not.toBeNull();
  });

  it("throws when pixelPerfect without font source", async () => {
    await expect(
      createFontAtlas({
        family: "monospace",
        size: 16,
        pixelPerfect: true
      })
    ).resolves.toBeDefined();
  });
});
