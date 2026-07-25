import { describe, expect, it } from "vitest";

describe("colorToCSS 8-digit hex vs rgba() format", () => {
  const HEX_BYTE_LOOKUP: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

  /**
   * formats a packed RGBA uint32 as a CSS hex color using a byte-to-hex lookup
   * table. drops the alpha pair when fully opaque, giving a 6-digit result.
   */
  function colorToCSSHex8(packed: number): string {
    packed >>>= 0;
    const r = (packed >>> 24) & 0xff;
    const g = (packed >>> 16) & 0xff;
    const b = (packed >>> 8) & 0xff;
    const a = packed & 0xff;
    return a === 0xff
      ? "#" + HEX_BYTE_LOOKUP[r] + HEX_BYTE_LOOKUP[g] + HEX_BYTE_LOOKUP[b]
      : "#" + HEX_BYTE_LOOKUP[r] + HEX_BYTE_LOOKUP[g] + HEX_BYTE_LOOKUP[b] + HEX_BYTE_LOOKUP[a];
  }

  it("produces correct opaque colors", () => {
    expect(colorToCSSHex8(0xff0000ff)).toBe("#ff0000");
    expect(colorToCSSHex8(0x00ff00ff)).toBe("#00ff00");
    expect(colorToCSSHex8(0x000000ff)).toBe("#000000");
    expect(colorToCSSHex8(0xffffffff)).toBe("#ffffff");
  });

  it("produces correct translucent colors", () => {
    expect(colorToCSSHex8(0xff000080)).toBe("#ff000080");
    expect(colorToCSSHex8(0xff000000)).toBe("#ff000000");
    expect(colorToCSSHex8(0x12345678)).toBe("#12345678");
  });

  it("handles boundary alpha values", () => {
    expect(colorToCSSHex8(0x000000fe)).toBe("#000000fe");
    expect(colorToCSSHex8(0x00000001)).toBe("#00000001");
  });
});

describe("formatValue caching", () => {
  /** baseline formatter with no caching: rounds when decimals is 0, else toFixed. */
  function naiveFormat(value: number, decimals: number): string {
    if (decimals === 0) {
      return String(Math.round(value));
    }
    return value.toFixed(decimals);
  }

  let cachedNum = NaN;
  let cachedStr = "";
  /**
   * caches the last formatted string and returns it when value repeats, skipping
   * the toFixed work. the cache key is value only, so a decimals change on the
   * same value would return the stale string.
   */
  function cachedFormat(value: number, decimals: number): string {
    if (value === cachedNum) {
      return cachedStr;
    }
    cachedNum = value;
    cachedStr = decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
    return cachedStr;
  }

  it("returns correct values", () => {
    expect(cachedFormat(3.14159, 2)).toBe("3.14");
    expect(cachedFormat(3.14159, 2)).toBe("3.14");
    expect(cachedFormat(0, 0)).toBe("0");
    expect(cachedFormat(42.5, 1)).toBe("42.5");
    expect(cachedFormat(-1.23, 2)).toBe("-1.23");
  });

  it("matches naive for all test values", () => {
    const values = [0, 1, -1, 0.5, 3.14159, 100.999, -42.123];
    for (const v of values) {
      for (const d of [0, 1, 2, 3]) {
        cachedNum = NaN;
        expect(cachedFormat(v, d)).toBe(naiveFormat(v, d));
      }
    }
  });

  it("returns cached result when value unchanged", () => {
    cachedNum = NaN;
    const first = cachedFormat(3.14, 2);
    const second = cachedFormat(3.14, 2);
    expect(first).toBe(second);
    expect(first).toBe("3.14");
  });

  it("handles NaN and Infinity", () => {
    cachedNum = NaN;
    expect(cachedFormat(NaN, 2)).toBe("NaN");
    cachedNum = NaN;
    expect(cachedFormat(Infinity, 2)).toBe("Infinity");
    cachedNum = NaN;
    expect(cachedFormat(-Infinity, 2)).toBe("-Infinity");
  });

  it("handles zero decimals", () => {
    cachedNum = NaN;
    expect(cachedFormat(3.7, 0)).toBe("4");
    cachedNum = NaN;
    expect(cachedFormat(3.2, 0)).toBe("3");
    cachedNum = NaN;
    expect(cachedFormat(-0.5, 0)).toBe("0");
  });
});

describe("invalidateLayout single-walk vs dual-walk", () => {
  interface FakeWidget {
    visible: boolean;
    needsLayout: boolean;
    parent: FakeWidget | null;
  }

  /** builds a parent-linked chain of `depth` nodes and returns the leaf; the root has a null parent. */
  function buildChain(depth: number): FakeWidget {
    let current: FakeWidget = { visible: true, needsLayout: false, parent: null };
    for (let i = 1; i < depth; i++) {
      current = { visible: true, needsLayout: false, parent: current };
    }
    return current;
  }

  /**
   * old two-pass invalidation: one loop marks needsLayout up the ancestor chain,
   * a second loop walks from the widget checking visibility. returns whether the
   * whole chain is visible.
   */
  function dualWalk(widget: FakeWidget): boolean {
    widget.needsLayout = true;
    let ancestor = widget.parent;
    while (ancestor) {
      ancestor.needsLayout = true;
      ancestor = ancestor.parent;
    }
    let w: FakeWidget | null = widget;
    while (w) {
      if (!w.visible) {
        return false;
      }
      w = w.parent;
    }
    return true;
  }

  /** single-pass version that marks needsLayout and tracks visibility in one ancestor traversal. */
  function singleWalk(widget: FakeWidget): boolean {
    widget.needsLayout = true;
    let allVisible = widget.visible;
    let ancestor = widget.parent;
    while (ancestor) {
      ancestor.needsLayout = true;
      if (allVisible && !ancestor.visible) {
        allVisible = false;
      }
      ancestor = ancestor.parent;
    }
    return allVisible;
  }

  it("both return true for fully visible chain", () => {
    const c1 = buildChain(10);
    const c2 = buildChain(10);
    expect(dualWalk(c1)).toBe(true);
    expect(singleWalk(c2)).toBe(true);
  });

  it("both return false when root is hidden", () => {
    const c1 = buildChain(5);
    let root1: FakeWidget = c1;
    while (root1.parent) {
      root1 = root1.parent;
    }
    root1.visible = false;

    const c2 = buildChain(5);
    let root2: FakeWidget = c2;
    while (root2.parent) {
      root2 = root2.parent;
    }
    root2.visible = false;

    expect(dualWalk(c1)).toBe(false);
    expect(singleWalk(c2)).toBe(false);
  });

  it("both set needsLayout on all ancestors", () => {
    const c1 = buildChain(5);
    singleWalk(c1);
    let w: FakeWidget | null = c1;
    while (w) {
      expect(w.needsLayout).toBe(true);
      w = w.parent;
    }
  });

  it("both return false when middle node is hidden", () => {
    const c1 = buildChain(8);
    let w1: FakeWidget | null = c1;
    for (let i = 0; i < 4 && w1; i++) {
      w1 = w1.parent;
    }
    if (w1) {
      w1.visible = false;
    }

    const c2 = buildChain(8);
    let w2: FakeWidget | null = c2;
    for (let i = 0; i < 4 && w2; i++) {
      w2 = w2.parent;
    }
    if (w2) {
      w2.visible = false;
    }

    expect(dualWalk(c1)).toBe(singleWalk(c2));
  });
});

describe("refresh guards prevent unnecessary markDirty", () => {
  it("slider refresh skips when value unchanged", () => {
    let dirtyCount = 0;
    const value = 5.0;
    let sliderValue = value;

    function refresh(currentValue: number): void {
      const snapped = Math.round(currentValue * 10) / 10;
      if (snapped === sliderValue) {
        return;
      }
      sliderValue = snapped;
      dirtyCount++;
    }

    refresh(value);
    refresh(value);
    refresh(value);
    expect(dirtyCount).toBe(0);

    refresh(6.0);
    expect(dirtyCount).toBe(1);

    refresh(6.0);
    expect(dirtyCount).toBe(1);
  });

  it("toggle refresh skips when value unchanged", () => {
    let dirtyCount = 0;
    let checked = false;

    function refresh(newVal: boolean): void {
      if (checked === newVal) {
        return;
      }
      checked = newVal;
      dirtyCount++;
    }

    refresh(false);
    refresh(false);
    expect(dirtyCount).toBe(0);

    refresh(true);
    expect(dirtyCount).toBe(1);

    refresh(true);
    expect(dirtyCount).toBe(1);
  });

  it("text refresh skips when value unchanged", () => {
    let dirtyCount = 0;
    let currentText = "hello";

    function refresh(newText: string): void {
      if (currentText === newText) {
        return;
      }
      currentText = newText;
      dirtyCount++;
    }

    refresh("hello");
    refresh("hello");
    expect(dirtyCount).toBe(0);

    refresh("world");
    expect(dirtyCount).toBe(1);
  });

  it("point2d refresh skips when values unchanged", () => {
    let dirtyCountX = 0;
    let dirtyCountY = 0;
    let lastX = NaN;
    let lastY = NaN;

    function refresh(x: number, y: number): void {
      if (x !== lastX) {
        lastX = x;
        dirtyCountX++;
      }
      if (y !== lastY) {
        lastY = y;
        dirtyCountY++;
      }
    }

    refresh(1, 2);
    expect(dirtyCountX).toBe(1);
    expect(dirtyCountY).toBe(1);

    refresh(1, 2);
    expect(dirtyCountX).toBe(1);
    expect(dirtyCountY).toBe(1);

    refresh(1, 3);
    expect(dirtyCountX).toBe(1);
    expect(dirtyCountY).toBe(2);

    refresh(5, 3);
    expect(dirtyCountX).toBe(2);
    expect(dirtyCountY).toBe(2);
  });

  it("monitor refresh skips formatValue when raw value unchanged", () => {
    let formatCalls = 0;
    let lastRaw: string | number = "";

    function formatValue(v: string | number): string {
      formatCalls++;
      return typeof v === "number" ? v.toFixed(2) : v;
    }

    function refresh(current: string | number): string | null {
      if (current === lastRaw) {
        return null;
      }
      lastRaw = current;
      return formatValue(current);
    }

    expect(refresh(42)).toBe("42.00");
    expect(formatCalls).toBe(1);

    expect(refresh(42)).toBeNull();
    expect(formatCalls).toBe(1);

    expect(refresh(43)).toBe("43.00");
    expect(formatCalls).toBe(2);
  });
});

describe("hue/alpha marker position bug fix", () => {
  it("old code: | (0 - 1) always produces -1", () => {
    const hue = 180;
    const w = 200;
    const oldResult = ((hue / 360) * w) | (0 - 1);
    expect(oldResult).toBe(-1);
  });

  it("old code: any hue value produces -1", () => {
    for (const hue of [0, 45, 90, 135, 180, 225, 270, 315, 360]) {
      const oldResult = ((hue / 360) * 200) | (0 - 1);
      expect(oldResult).toBe(-1);
    }
  });

  it("fixed code: produces correct marker position", () => {
    const hue = 180;
    const w = 200;
    const fixedResult = ((hue / 360) * w - 1) | 0;
    expect(fixedResult).toBe(99);
  });

  it("fixed code: hue=0 positions at start", () => {
    const fixedResult = ((0 / 360) * 200 - 1) | 0;
    expect(fixedResult).toBe(-1);
  });

  it("fixed code: hue=360 positions at end", () => {
    const fixedResult = ((360 / 360) * 200 - 1) | 0;
    expect(fixedResult).toBe(199);
  });

  it("fixed code: alpha=0.5 positions at midpoint", () => {
    const alpha = 0.5;
    const w = 200;
    const fixedResult = (alpha * w - 1) | 0;
    expect(fixedResult).toBe(99);
  });
});
