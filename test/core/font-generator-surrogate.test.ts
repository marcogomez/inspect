// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createFontAtlas } from "../../src/core/font-generator";

describe("createFontAtlas with surrogate pair extraChars", () => {
  it("handles emoji codepoints above 0xFFFF in extraChars", async () => {
    const fontPath = resolve(__dirname, "../fixtures/JetBrainsMono-Regular.ttf");
    const fontData = readFileSync(fontPath).buffer;
    const atlas = await createFontAtlas({
      family: "JBM",
      size: 14,
      fontData: fontData as ArrayBuffer,
      pixelPerfect: true,
      extraChars: "\u{1F600}"
    });
    expect(atlas).toBeDefined();
  });
});
