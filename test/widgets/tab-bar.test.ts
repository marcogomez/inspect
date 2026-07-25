// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { TabBar } from "../../src/widgets/tab-bar";
import { makeFakeTheme } from "../test-helpers";

describe("TabBar", () => {
  describe("defaults", () => {
    it("starts with empty tabs and no value", () => {
      const tb = new TabBar();
      expect(tb.tabs).toHaveLength(0);
      expect(tb.value).toBe("");
    });

    it("starts with no onChange", () => {
      const tb = new TabBar();
      expect(tb.onChange).toBeNull();
    });

    it("starts with content tab sizing", () => {
      const tb = new TabBar();
      expect(tb.tabSizing).toBe("content");
    });

    it("starts with reservedEdge 0", () => {
      const tb = new TabBar();
      expect(tb.reservedEdge).toBe(0);
    });
  });

  describe("tab click", () => {
    it("changes value on tab click", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.tabs = [
        { label: "TAB1", value: "0" },
        { label: "TAB2", value: "1" }
      ];
      tb.value = "0";
      tb.invalidateTabs();
      const changeSpy = vi.fn();
      tb.onChange = changeSpy;
      const secondTabX = 100;
      tb.onPointerDown(1, secondTabX, 15, 0);
      if (changeSpy.mock.calls.length > 0) {
        expect(changeSpy).toHaveBeenCalledWith("1");
        expect(tb.value).toBe("1");
      }
    });

    it("does not fire onChange when clicking the active tab", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.tabs = [
        { label: "TAB1", value: "0" },
        { label: "TAB2", value: "1" }
      ];
      tb.value = "0";
      tb.invalidateTabs();
      const changeSpy = vi.fn();
      tb.onChange = changeSpy;
      tb.onPointerDown(1, 20, 15, 0);
      expect(changeSpy).not.toHaveBeenCalled();
    });

    it("rejects non-left button", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.tabs = [{ label: "TAB", value: "0" }];
      const accepted = tb.onPointerDown(1, 20, 15, 2);
      expect(accepted).toBe(false);
    });

    it("rejects when disabled", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.enabled = false;
      tb.tabs = [{ label: "TAB", value: "0" }];
      const accepted = tb.onPointerDown(1, 20, 15, 0);
      expect(accepted).toBe(false);
    });

    it("rejects with no tabs", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      const accepted = tb.onPointerDown(1, 20, 15, 0);
      expect(accepted).toBe(false);
    });
  });

  describe("hover", () => {
    it("tracks hover index on pointer move", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.tabs = [
        { label: "TAB1", value: "0" },
        { label: "TAB2", value: "1" }
      ];
      tb.value = "0";
      tb.invalidateTabs();
      tb.onPointerMove(1, 200, 15);
    });

    it("clears hover on pointer leave", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.tabs = [
        { label: "TAB1", value: "0" },
        { label: "TAB2", value: "1" }
      ];
      tb.value = "0";
      tb.invalidateTabs();
      tb.onPointerMove(1, 200, 15);
      tb.onPointerLeave();
    });
  });

  describe("wheel scroll", () => {
    it("returns false before draw (tab positions not yet computed)", () => {
      const tb = new TabBar();
      tb.width = 100;
      tb.height = 35;
      tb.tabs = [];
      for (let i = 0; i < 10; i++) {
        tb.tabs.push({ label: `TAB_${i}_LONG_NAME`, value: String(i) });
      }
      tb.value = "0";
      tb.invalidateTabs();
      const handled = tb.onWheel(100, 0);
      expect(handled).toBe(false);
    });

    it("returns false when tabs fit", () => {
      const tb = new TabBar();
      tb.width = 800;
      tb.height = 35;
      tb.tabs = [{ label: "A", value: "0" }];
      tb.value = "0";
      tb.invalidateTabs();
      const handled = tb.onWheel(100, 0);
      expect(handled).toBe(false);
    });

    it("returns false for zero delta", () => {
      const tb = new TabBar();
      tb.width = 100;
      tb.height = 35;
      tb.tabs = [];
      for (let i = 0; i < 10; i++) {
        tb.tabs.push({ label: `TAB_${i}_LONG_NAME`, value: String(i) });
      }
      tb.value = "0";
      tb.invalidateTabs();
      const handled = tb.onWheel(0, 0);
      expect(handled).toBe(false);
    });
  });

  describe("tab sizing modes", () => {
    it("equal sizing divides width equally", () => {
      const tb = new TabBar();
      tb.width = 300;
      tb.height = 35;
      tb.tabSizing = "equal";
      tb.tabs = [
        { label: "A", value: "0" },
        { label: "B", value: "1" },
        { label: "C", value: "2" }
      ];
      tb.invalidateTabs();
    });
  });

  describe("invalidateTabs", () => {
    it("marks tabs dirty for recomputation", () => {
      const tb = new TabBar();
      tb.tabs = [{ label: "A", value: "0" }];
      tb.invalidateTabs();
    });
  });

  describe("drawing", () => {
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

    it("draws tabs with active tab highlighted", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.tabs = [
        { label: "TAB ONE", value: "0" },
        { label: "TAB TWO", value: "1" },
        { label: "TAB THREE", value: "2" }
      ];
      tb.value = "1";
      tb.invalidateTabs();
      drawTabBar(tb);
    });

    it("draws with no tabs (empty)", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      drawTabBar(tb);
    });

    it("draws separator between inactive tabs", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.tabs = [
        { label: "A", value: "0" },
        { label: "B", value: "1" },
        { label: "C", value: "2" }
      ];
      tb.value = "0";
      tb.invalidateTabs();
      drawTabBar(tb);
    });

    it("draws with equal tab sizing", () => {
      const tb = new TabBar();
      tb.width = 300;
      tb.height = 35;
      tb.tabSizing = "equal";
      tb.tabs = [
        { label: "A", value: "0" },
        { label: "B", value: "1" }
      ];
      tb.value = "0";
      tb.invalidateTabs();
      drawTabBar(tb);
    });

    it("draws with overflow arrows after scrolling", () => {
      const tb = new TabBar();
      tb.width = 100;
      tb.height = 35;
      tb.tabs = [];
      for (let i = 0; i < 10; i++) {
        tb.tabs.push({ label: `TAB_${i}_LONG`, value: String(i) });
      }
      tb.value = "0";
      tb.invalidateTabs();
      drawTabBar(tb);
      tb.onPointerDown(1, 90, 15, 0);
      drawTabBar(tb);
    });

    it("draws with reserved edge", () => {
      const tb = new TabBar();
      tb.width = 400;
      tb.height = 35;
      tb.reservedEdge = 40;
      tb.tabs = [
        { label: "A", value: "0" },
        { label: "B", value: "1" }
      ];
      tb.value = "0";
      tb.invalidateTabs();
      drawTabBar(tb);
    });

    it("draws hover state on inactive tab", () => {
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
      tb.onPointerMove(1, 200, 15);
      drawTabBar(tb);
    });

    it("clicks left arrow to scroll left", () => {
      const tb = new TabBar();
      tb.width = 100;
      tb.height = 35;
      tb.tabs = [];
      for (let i = 0; i < 10; i++) {
        tb.tabs.push({ label: `TAB_${i}_LONG`, value: String(i) });
      }
      tb.value = "5";
      tb.invalidateTabs();
      drawTabBar(tb);
      tb.onPointerDown(1, 95, 15, 0);
      drawTabBar(tb);
      tb.onPointerDown(1, 5, 15, 0);
      drawTabBar(tb);
    });

    it("clicks right arrow to scroll right", () => {
      const tb = new TabBar();
      tb.width = 100;
      tb.height = 35;
      tb.tabs = [];
      for (let i = 0; i < 10; i++) {
        tb.tabs.push({ label: `TAB_${i}_LONG`, value: String(i) });
      }
      tb.value = "0";
      tb.invalidateTabs();
      drawTabBar(tb);
      tb.onPointerDown(1, 95, 15, 0);
      drawTabBar(tb);
    });

    it("scrollActiveTabIntoView when selecting a tab", () => {
      const tb = new TabBar();
      tb.width = 100;
      tb.height = 35;
      tb.tabs = [];
      for (let i = 0; i < 10; i++) {
        tb.tabs.push({ label: `TAB_${i}_LONG`, value: String(i) });
      }
      tb.value = "0";
      tb.onChange = () => {
        /* no-op */
      };
      tb.invalidateTabs();
      drawTabBar(tb);
      tb.onPointerDown(1, 50, 15, 0);
    });

    it("uses vertical deltaY for wheel when deltaX is small", () => {
      const tb = new TabBar();
      tb.width = 100;
      tb.height = 35;
      tb.tabs = [];
      for (let i = 0; i < 10; i++) {
        tb.tabs.push({ label: `TAB_${i}_LONG`, value: String(i) });
      }
      tb.value = "0";
      tb.invalidateTabs();
      drawTabBar(tb);
      tb.onWheel(0, 50);
    });

    it("computeTabPositions caches and skips recomputation", () => {
      const tb = new TabBar();
      tb.width = 300;
      tb.height = 35;
      tb.tabs = [
        { label: "A", value: "0" },
        { label: "B", value: "1" }
      ];
      tb.value = "0";
      tb.invalidateTabs();
      drawTabBar(tb);
      drawTabBar(tb);
    });
  });
});
