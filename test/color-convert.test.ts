import { describe, expect, it } from "vitest";

import {
  HEX_LUT,
  hsvToRgb,
  packRGBA,
  packRGBA8,
  packedToRgbObj,
  rgbObjToPacked,
  rgbToHsv,
  unpackRGBA
} from "../src/utils/color-convert";

describe("rgbToHsv", () => {
  it("converts pure red", () => {
    const hsv = rgbToHsv(1, 0, 0);
    expect(hsv[0]).toBeCloseTo(0);
    expect(hsv[1]).toBeCloseTo(1);
    expect(hsv[2]).toBeCloseTo(1);
  });

  it("converts pure green", () => {
    const hsv = rgbToHsv(0, 1, 0);
    expect(hsv[0]).toBeCloseTo(120);
    expect(hsv[1]).toBeCloseTo(1);
    expect(hsv[2]).toBeCloseTo(1);
  });

  it("converts pure blue", () => {
    const hsv = rgbToHsv(0, 0, 1);
    expect(hsv[0]).toBeCloseTo(240);
    expect(hsv[1]).toBeCloseTo(1);
    expect(hsv[2]).toBeCloseTo(1);
  });

  it("converts black (all zeros)", () => {
    const hsv = rgbToHsv(0, 0, 0);
    expect(hsv[0]).toBe(0);
    expect(hsv[1]).toBe(0);
    expect(hsv[2]).toBe(0);
  });

  it("converts white", () => {
    const hsv = rgbToHsv(1, 1, 1);
    expect(hsv[0]).toBe(0);
    expect(hsv[1]).toBe(0);
    expect(hsv[2]).toBeCloseTo(1);
  });

  it("converts gray (no saturation)", () => {
    const hsv = rgbToHsv(0.5, 0.5, 0.5);
    expect(hsv[1]).toBe(0);
    expect(hsv[2]).toBeCloseTo(0.5);
  });

  it("returns the same scratch tuple (zero-alloc)", () => {
    const a = rgbToHsv(1, 0, 0);
    const b = rgbToHsv(0, 1, 0);
    expect(a).toBe(b);
  });
});

describe("hsvToRgb", () => {
  it("converts hue=0 sat=1 val=1 to red", () => {
    const rgb = hsvToRgb(0, 1, 1);
    expect(rgb[0]).toBeCloseTo(1);
    expect(rgb[1]).toBeCloseTo(0);
    expect(rgb[2]).toBeCloseTo(0);
  });

  it("converts hue=120 to green", () => {
    const rgb = hsvToRgb(120, 1, 1);
    expect(rgb[0]).toBeCloseTo(0);
    expect(rgb[1]).toBeCloseTo(1);
    expect(rgb[2]).toBeCloseTo(0);
  });

  it("converts hue=240 to blue", () => {
    const rgb = hsvToRgb(240, 1, 1);
    expect(rgb[0]).toBeCloseTo(0);
    expect(rgb[1]).toBeCloseTo(0);
    expect(rgb[2]).toBeCloseTo(1);
  });

  it("roundtrips with rgbToHsv", () => {
    const r = 0.3;
    const g = 0.6;
    const b = 0.9;
    const hsv = rgbToHsv(r, g, b);
    const h = hsv[0];
    const s = hsv[1];
    const v = hsv[2];
    const rgb = hsvToRgb(h, s, v);
    expect(rgb[0]).toBeCloseTo(r, 4);
    expect(rgb[1]).toBeCloseTo(g, 4);
    expect(rgb[2]).toBeCloseTo(b, 4);
  });

  it("returns the same scratch tuple (zero-alloc)", () => {
    const a = hsvToRgb(0, 1, 1);
    const b = hsvToRgb(120, 1, 1);
    expect(a).toBe(b);
  });
});

describe("packRGBA", () => {
  it("packs white opaque", () => {
    expect(packRGBA(1, 1, 1, 1)).toBe(0xffffffff);
  });

  it("packs black opaque", () => {
    expect(packRGBA(0, 0, 0, 1)).toBe(0x000000ff);
  });

  it("packs pure red", () => {
    expect(packRGBA(1, 0, 0, 1)).toBe(0xff0000ff);
  });

  it("packs with alpha", () => {
    const packed = packRGBA(1, 0, 0, 0.5);
    expect(packed & 0xff).toBe(128);
  });

  it("defaults alpha to 1", () => {
    expect(packRGBA(0, 0, 0) & 0xff).toBe(255);
  });
});

describe("packRGBA8", () => {
  it("packs 0-255 values", () => {
    expect(packRGBA8(255, 0, 0, 255)).toBe(0xff0000ff);
  });

  it("defaults alpha to 255", () => {
    expect(packRGBA8(0, 0, 0) & 0xff).toBe(255);
  });
});

describe("unpackRGBA", () => {
  it("unpacks white", () => {
    const c = unpackRGBA(0xffffffff);
    expect(c[0]).toBeCloseTo(1);
    expect(c[1]).toBeCloseTo(1);
    expect(c[2]).toBeCloseTo(1);
    expect(c[3]).toBeCloseTo(1);
  });

  it("unpacks red", () => {
    const c = unpackRGBA(0xff0000ff);
    expect(c[0]).toBeCloseTo(1);
    expect(c[1]).toBeCloseTo(0);
    expect(c[2]).toBeCloseTo(0);
    expect(c[3]).toBeCloseTo(1);
  });

  it("returns the same scratch tuple (zero-alloc)", () => {
    const a = unpackRGBA(0xff0000ff);
    const b = unpackRGBA(0x00ff00ff);
    expect(a).toBe(b);
  });
});

describe("rgbObjToPacked", () => {
  it("packs object to uint32", () => {
    expect(rgbObjToPacked({ r: 1, g: 0, b: 0 })).toBe(0xff0000ff);
  });

  it("clamps values to 0-1", () => {
    const packed = rgbObjToPacked({ r: 2, g: -1, b: 0.5 });
    expect((packed >>> 24) & 0xff).toBe(255);
    expect((packed >>> 16) & 0xff).toBe(0);
    expect((packed >>> 8) & 0xff).toBe(128);
  });
});

describe("packedToRgbObj", () => {
  it("unpacks to object", () => {
    const obj = packedToRgbObj(0xff0000ff);
    expect(obj.r).toBeCloseTo(1);
    expect(obj.g).toBeCloseTo(0);
    expect(obj.b).toBeCloseTo(0);
  });

  it("returns the same scratch object (zero-alloc)", () => {
    const a = packedToRgbObj(0xff0000ff);
    const b = packedToRgbObj(0x00ff00ff);
    expect(a).toBe(b);
    expect(b.r).toBeCloseTo(0);
    expect(b.g).toBeCloseTo(1);
  });

  it("roundtrips with rgbObjToPacked", () => {
    const original = { r: 0.5, g: 0.25, b: 0.75 };
    const packed = rgbObjToPacked(original);
    const result = packedToRgbObj(packed);
    expect(result.r).toBeCloseTo(original.r, 1);
    expect(result.g).toBeCloseTo(original.g, 1);
    expect(result.b).toBeCloseTo(original.b, 1);
  });
});

describe("HEX_LUT", () => {
  it("has 256 entries", () => {
    expect(HEX_LUT.length).toBe(256);
  });

  it("maps 0 to '00'", () => {
    expect(HEX_LUT[0]).toBe("00");
  });

  it("maps 255 to 'ff'", () => {
    expect(HEX_LUT[255]).toBe("ff");
  });

  it("maps 16 to '10'", () => {
    expect(HEX_LUT[16]).toBe("10");
  });

  it("is equivalent to toString(16).padStart(2, '0') for all values", () => {
    for (let i = 0; i < 256; i++) {
      expect(HEX_LUT[i]).toBe(i.toString(16).padStart(2, "0"));
    }
  });
});
