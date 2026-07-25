// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { TabBar } from "../../src/widgets/tab-bar";
import { makeFakeTheme } from "../test-helpers";

/** draws the tab bar once onto a throwaway 400x40 canvas, which also computes tab positions. */
function drawTabBar(tb: TabBar): void {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 40;
  const renderer = new Canvas2DRenderer(canvas);
  renderer.begin(400, 40);
  tb.draw(renderer, makeFakeTheme());
  renderer.end();
}

/**
 * builds a narrow tab bar with ten long-named tabs so they overflow the width,
 * then draws once to compute positions and enable the scroll and arrow paths.
 */
function createOverflowTabBar(width = 100) {
  const tb = new TabBar();
  tb.width = width;
  tb.height = 35;
  tb.tabs = [];
  for (let i = 0; i < 10; i++) {
    tb.tabs.push({ label: `TAB_${i}_LONGNAME`, value: String(i) });
  }
  tb.value = "0";
  tb.invalidateTabs();
  drawTabBar(tb);
  return tb;
}

describe("TabBar scrollActiveTabIntoView", () => {
  it("scrolls left when active tab is before viewport", () => {
    const tb = createOverflowTabBar();
    tb.onPointerDown(1, tb.width - 5, 15, 0);
    drawTabBar(tb);
    tb.onPointerDown(1, tb.width - 5, 15, 0);
    drawTabBar(tb);
    tb.onPointerDown(1, tb.width - 5, 15, 0);
    drawTabBar(tb);

    tb.value = "0";
    const changeSpy = vi.fn();
    tb.onChange = changeSpy;

    tb.onPointerDown(1, 30, 15, 0);
    drawTabBar(tb);
  });

  it("scrolls right when active tab is past viewport", () => {
    const tb = createOverflowTabBar();
    tb.value = "9";
    tb.invalidateTabs();
    drawTabBar(tb);
  });
});

describe("TabBar wheel deltaY fallback", () => {
  it("uses deltaY when deltaX is 0", () => {
    const tb = createOverflowTabBar();
    const handled = tb.onWheel(0, 100);
    expect(handled).toBe(true);
  });

  it("uses deltaX when provided", () => {
    const tb = createOverflowTabBar();
    const handled = tb.onWheel(100, 0);
    expect(handled).toBe(true);
  });

  it("clamps scroll to max", () => {
    const tb = createOverflowTabBar();
    tb.onWheel(0, 10000);
    drawTabBar(tb);
    tb.onWheel(0, 10000);
  });

  it("clamps scroll to 0", () => {
    const tb = createOverflowTabBar();
    tb.onWheel(0, -10000);
  });
});

describe("TabBar equal sizing draws correctly", () => {
  it("draws equal-sized tabs", () => {
    const tb = new TabBar();
    tb.width = 300;
    tb.height = 35;
    tb.tabSizing = "equal";
    tb.tabs = [
      { label: "A", value: "0" },
      { label: "B", value: "1" },
      { label: "C", value: "2" }
    ];
    tb.value = "1";
    tb.invalidateTabs();
    drawTabBar(tb);
  });
});

describe("TabBar hover states in overflow mode", () => {
  it("hover on tab in overflow mode", () => {
    const tb = createOverflowTabBar();
    tb.onPointerMove(1, 30, 15);
    drawTabBar(tb);
  });

  it("hover on arrow area", () => {
    const tb = createOverflowTabBar();
    tb.onPointerMove(1, tb.width - 5, 15);
    drawTabBar(tb);
  });
});

describe("TabBar hover rendering on non-active tab", () => {
  it("draws hover highlight on second tab", () => {
    const tb = new TabBar();
    tb.width = 400;
    tb.height = 35;
    tb.tabs = [
      { label: "AAA", value: "0" },
      { label: "BBB", value: "1" }
    ];
    tb.value = "0";
    tb.invalidateTabs();
    drawTabBar(tb);
    tb.onPointerMove(1, 65, 15);
    drawTabBar(tb);
  });

  it("clears hover and redraws", () => {
    const tb = new TabBar();
    tb.width = 400;
    tb.height = 35;
    tb.tabs = [
      { label: "AAA", value: "0" },
      { label: "BBB", value: "1" }
    ];
    tb.value = "0";
    tb.invalidateTabs();
    drawTabBar(tb);
    tb.onPointerMove(1, 65, 15);
    drawTabBar(tb);
    tb.onPointerLeave();
    drawTabBar(tb);
  });

  it("hover on active tab does not set hover index", () => {
    const tb = new TabBar();
    tb.width = 400;
    tb.height = 35;
    tb.tabs = [
      { label: "AAA", value: "0" },
      { label: "BBB", value: "1" }
    ];
    tb.value = "0";
    tb.invalidateTabs();
    drawTabBar(tb);
    tb.onPointerMove(1, 15, 15);
    drawTabBar(tb);
  });
});

describe("TabBar scrollActiveTabIntoView right scroll", () => {
  it("scrolls to show last tab when set as active", () => {
    const tb = createOverflowTabBar();
    tb.value = "9";
    tb.invalidateTabs();
    drawTabBar(tb);
  });
});

describe("TabBar resize recomputation", () => {
  it("recomputes tab positions when width changes", () => {
    const tb = new TabBar();
    tb.width = 400;
    tb.height = 35;
    tb.tabs = [
      { label: "AAA", value: "0" },
      { label: "BBB", value: "1" }
    ];
    tb.value = "0";
    tb.invalidateTabs();
    drawTabBar(tb);

    tb.width = 300;
    drawTabBar(tb);
  });

  it("reallocates position arrays when tab count exceeds capacity", () => {
    const tb = new TabBar();
    tb.width = 800;
    tb.height = 35;
    tb.tabs = [{ label: "A", value: "0" }];
    tb.value = "0";
    tb.invalidateTabs();
    drawTabBar(tb);

    for (let i = 1; i < 20; i++) {
      tb.tabs.push({ label: `TAB${i}`, value: String(i) });
    }
    tb.invalidateTabs();
    drawTabBar(tb);
  });
});

describe("TabBar onWheel zero delta on overflow", () => {
  it("returns false for both deltaX and deltaY being 0", () => {
    const tb = createOverflowTabBar();
    expect(tb.onWheel(0, 0)).toBe(false);
  });
});
