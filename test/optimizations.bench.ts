import { bench, describe } from "vitest";

import { HEX_LUT, hsvToRgb, packRGBA, packedToRgbObj, rgbToHsv, unpackRGBA } from "../src/utils/color-convert";

describe("color-convert scratch tuples vs naive allocation", () => {
  bench("rgbToHsv (scratch tuple)", () => {
    rgbToHsv(0.3, 0.6, 0.9);
  });

  bench("hsvToRgb (scratch tuple)", () => {
    hsvToRgb(210, 0.67, 0.9);
  });

  bench("packRGBA", () => {
    packRGBA(0.3, 0.6, 0.9, 1);
  });

  bench("unpackRGBA (scratch tuple)", () => {
    unpackRGBA(0xff8040ff);
  });

  bench("packedToRgbObj (scratch obj, optimized)", () => {
    packedToRgbObj(0xff8040ff);
  });

  bench("packedToRgbObj NAIVE (new object every call)", () => {
    const color = 0xff8040ff;
    const _ = {
      r: ((color >>> 24) & 0xff) / 255,
      g: ((color >>> 16) & 0xff) / 255,
      b: ((color >>> 8) & 0xff) / 255
    };
    void _;
  });
});

describe("HEX_LUT vs toString(16).padStart", () => {
  bench("HEX_LUT[i] concatenation (optimized)", () => {
    const _ = HEX_LUT[128] + HEX_LUT[64] + HEX_LUT[32];
    void _;
  });

  bench("toString(16).padStart (naive)", () => {
    const _ =
      (128).toString(16).padStart(2, "0") + (64).toString(16).padStart(2, "0") + (32).toString(16).padStart(2, "0");
    void _;
  });
});

describe("colorToCSS: 8-digit hex vs rgba() string format", () => {
  const HEX_BYTE_LOOKUP: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
  const ALPHA_FRACTION_LOOKUP: string[] = Array.from({ length: 256 }, (_, i) => (i / 255).toFixed(3));

  /** builds a CSS hex color by concatenating precomputed byte-to-hex strings. */
  function hex8Format(r: number, g: number, b: number, a: number): string {
    return "#" + HEX_BYTE_LOOKUP[r] + HEX_BYTE_LOOKUP[g] + HEX_BYTE_LOOKUP[b] + HEX_BYTE_LOOKUP[a];
  }

  /** builds a CSS rgba() string, the older path this benchmark compares against. */
  function rgbaFormat(r: number, g: number, b: number, a: number): string {
    return "rgba(" + r + "," + g + "," + b + "," + ALPHA_FRACTION_LOOKUP[a] + ")";
  }

  bench("8-digit hex format (optimized)", () => {
    hex8Format(255, 128, 64, 128);
  });

  bench("rgba() string format (old)", () => {
    rgbaFormat(255, 128, 64, 128);
  });
});

describe("cache strategies", () => {
  bench("last-used fast path (same color repeated)", () => {
    const cache = new Map<number, string>();
    cache.set(0xff0000ff, "#ff0000");
    let lastColor = -1;
    let lastResult = "";
    let sum = 0;
    for (let i = 0; i < 100; i++) {
      const color = 0xff0000ff;
      if (color === lastColor) {
        sum += lastResult.length;
      } else {
        const result = cache.get(color);
        if (result === undefined) {
          throw new Error("expected a cache hit");
        }
        lastColor = color;
        lastResult = result;
        sum += result.length;
      }
    }
    void sum;
  });

  bench("map lookup only (same color repeated)", () => {
    const cache = new Map<number, string>();
    cache.set(0xff0000ff, "#ff0000");
    let sum = 0;
    for (let i = 0; i < 100; i++) {
      const result = cache.get(0xff0000ff);
      if (result === undefined) {
        throw new Error("expected a cache hit");
      }
      sum += result.length;
    }
    void sum;
  });

  bench("Map<number> key lookup", () => {
    const cache = new Map<number, string>();
    cache.set(0xff0000ff, "r");
    cache.set(0x00ff00ff, "g");
    cache.set(0x0000ffff, "b");
    for (let i = 0; i < 100; i++) {
      cache.get(0xff0000ff);
      cache.get(0x00ff00ff);
      cache.get(0x0000ffff);
    }
  });

  bench("Map<string> key lookup", () => {
    const cache = new Map<string, string>();
    cache.set("#ff0000", "r");
    cache.set("#00ff00", "g");
    cache.set("#0000ff", "b");
    for (let i = 0; i < 100; i++) {
      cache.get("#ff0000");
      cache.get("#00ff00");
      cache.get("#0000ff");
    }
  });
});

describe("formatValue caching", () => {
  bench("naive toFixed (new string every call)", () => {
    const _ = (3.14159).toFixed(2);
    void _;
  });

  let cachedNum = NaN;
  let cachedStr = "";
  bench("cached toFixed (same value repeated)", () => {
    const value = 3.14159;
    if (value !== cachedNum) {
      cachedNum = value;
      cachedStr = value.toFixed(2);
    }
    const _ = cachedStr;
    void _;
  });
});

describe("invalidateLayout: single walk vs dual walk", () => {
  interface FW {
    visible: boolean;
    needsLayout: boolean;
    parent: FW | null;
  }

  /** builds a parent-linked chain of `depth` nodes and returns the leaf; the root has a null parent. */
  function buildChain(depth: number): FW {
    let current: FW = { visible: true, needsLayout: false, parent: null };
    for (let i = 1; i < depth; i++) {
      current = { visible: true, needsLayout: false, parent: current };
    }
    return current;
  }

  bench("dual walk (old: 2 traversals)", () => {
    const w = buildChain(8);
    w.needsLayout = true;
    let a = w.parent;
    while (a) {
      a.needsLayout = true;
      a = a.parent;
    }
    let v: FW | null = w;
    while (v) {
      if (!v.visible) {
        break;
      }
      v = v.parent;
    }
  });

  bench("single walk (optimized: 1 traversal)", () => {
    const w = buildChain(8);
    w.needsLayout = true;
    let allVisible = w.visible;
    let a = w.parent;
    while (a) {
      a.needsLayout = true;
      if (allVisible && !a.visible) {
        allVisible = false;
      }
      a = a.parent;
    }
  });
});
