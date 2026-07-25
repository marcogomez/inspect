// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { rgbToHsv } from "../src/utils/color-convert";

describe("rgbToHsv negative hue correction", () => {
  it("produces positive hue for blue-dominant color (r-g negative delta)", () => {
    const hsv = rgbToHsv(0.1, 0.2, 0.9);
    expect(hsv[0]).toBeGreaterThanOrEqual(0);
    expect(hsv[0]).toBeLessThanOrEqual(360);
  });

  it("produces hue in 240-280 range for pure blue-ish", () => {
    const hsv = rgbToHsv(0, 0, 1);
    expect(hsv[0]).toBeCloseTo(240, 0);
  });

  it("corrects negative hue when red is max and green < blue", () => {
    const hsv = rgbToHsv(1.0, 0.0, 0.5);
    expect(hsv[0]).toBeGreaterThanOrEqual(0);
    expect(hsv[0]).toBeCloseTo(330, 0);
  });
});
