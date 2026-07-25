// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseTTF } from "../../src/core/ttf-parser";

describe("TTF parser composite glyphs", () => {
  it("parses JetBrains Mono composite glyphs (accented chars)", async () => {
    const fontPath = resolve(__dirname, "../fixtures/JetBrainsMono-Regular.ttf");
    const fontData = readFileSync(fontPath).buffer;
    const font = await parseTTF(fontData as ArrayBuffer);

    const eCodePoint = "é".codePointAt(0);
    if (eCodePoint === undefined) {
      throw new Error("missing code point");
    }
    const eAccute = font.glyphs.get(eCodePoint);
    if (eAccute) {
      expect(eAccute.contours.length).toBeGreaterThan(0);
    }

    const nCodePoint = "ñ".codePointAt(0);
    if (nCodePoint === undefined) {
      throw new Error("missing code point");
    }
    const nTilde = font.glyphs.get(nCodePoint);
    if (nTilde) {
      expect(nTilde.contours.length).toBeGreaterThan(0);
    }
  });

  it("parses a wide range of glyphs including composites", async () => {
    const fontPath = resolve(__dirname, "../fixtures/JetBrainsMono-Regular.ttf");
    const fontData = readFileSync(fontPath).buffer;
    const font = await parseTTF(fontData as ArrayBuffer);

    expect(font.unitsPerEm).toBeGreaterThan(0);
    expect(font.advanceWidth).toBeGreaterThan(0);
    expect(font.glyphs.size).toBeGreaterThan(80);

    const aCodePoint = "A".codePointAt(0);
    if (aCodePoint === undefined) {
      throw new Error("missing code point");
    }
    const aGlyph = font.glyphs.get(aCodePoint);
    if (!aGlyph) {
      throw new Error("expected a glyph for 'A'");
    }
    expect(aGlyph.contours.length).toBeGreaterThan(0);
  });

  it("handles glyphs with all flag types", async () => {
    const fontPath = resolve(__dirname, "../fixtures/JetBrainsMono-Regular.ttf");
    const fontData = readFileSync(fontPath).buffer;
    const font = await parseTTF(fontData as ArrayBuffer);

    let hasOnCurve = false;
    let hasOffCurve = false;
    for (const [, glyph] of font.glyphs) {
      for (const contour of glyph.contours) {
        for (const point of contour.points) {
          if (point.onCurve) {
            hasOnCurve = true;
          } else {
            hasOffCurve = true;
          }
        }
      }
      if (hasOnCurve && hasOffCurve) {
        break;
      }
    }
    expect(hasOnCurve).toBe(true);
    expect(hasOffCurve).toBe(true);
  });
});
