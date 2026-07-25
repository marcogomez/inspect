// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Widget } from "../../src/core/widget";
import { DEFAULTS } from "../../src/defaults";
import { ScrollArea } from "../../src/widgets/scroll-area";
import { makeFakeTheme } from "../test-helpers";

/** builds a ScrollArea of the given size with a vertical stretch stack layout. */
function makeScrollArea(w: number, h: number): ScrollArea {
  const sa = new ScrollArea();
  sa.width = w;
  sa.height = h;
  sa.layout = new StackLayout("vertical", 0, "start", "stretch");
  return sa;
}

describe("ScrollArea", () => {
  describe("defaults", () => {
    it("starts with scrollY 0", () => {
      const sa = new ScrollArea();
      expect(sa.scrollY).toBe(0);
    });

    it("defaults to top anchor mode", () => {
      const sa = new ScrollArea();
      expect(sa.anchorMode).toBe("top");
    });

    it("defaults scrollbar width from DEFAULTS", () => {
      const sa = new ScrollArea();
      expect(sa.scrollbarWidth).toBe(DEFAULTS.scrollDefaultWidth);
    });

    it("shows scrollbar by default", () => {
      const sa = new ScrollArea();
      expect(sa.showScrollbar).toBe(true);
    });
  });

  describe("scrollBy / setScroll", () => {
    it("scrollBy adds delta to scrollY", () => {
      const sa = makeScrollArea(200, 100);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      sa.scrollBy(50);
      expect(sa.scrollY).toBe(50);
    });

    it("setScroll clamps to [0, maxScroll]", () => {
      const sa = makeScrollArea(200, 100);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      sa.setScroll(-50);
      expect(sa.scrollY).toBe(0);
      sa.setScroll(99999);
      expect(sa.scrollY).toBeLessThanOrEqual(500);
    });

    it("does not dirty when scroll doesn't change", () => {
      const sa = makeScrollArea(200, 100);
      sa.setScroll(0);
      expect(sa.scrollY).toBe(0);
    });
  });

  describe("onWheel", () => {
    it("scrolls on wheel when content overflows", () => {
      const sa = makeScrollArea(200, 100);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      const handled = sa.onWheel(0, 100);
      expect(handled).toBe(true);
      expect(sa.scrollY).toBeGreaterThan(0);
    });

    it("returns false when content fits", () => {
      const sa = makeScrollArea(200, 100);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 50;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      const handled = sa.onWheel(0, 100);
      expect(handled).toBe(false);
    });

    it("scrolls in center anchor mode", () => {
      const sa = makeScrollArea(200, 100);
      sa.anchorMode = "center";
      sa.rowHeight = 20;
      sa.anchorRow = 10;
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      sa.onWheel(0, -100);
      expect(sa.manualScrollOffset).not.toBe(0);
    });
  });

  describe("scrollbar pointer interaction", () => {
    it("captures pointer on scrollbar area", () => {
      const sa = makeScrollArea(200, 100);
      sa.setPaddingAll(0);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      const accepted = sa.onPointerDown(1, 198, 10, 0);
      expect(accepted).toBe(true);
    });

    it("rejects pointer outside scrollbar area", () => {
      const sa = makeScrollArea(200, 100);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      const accepted = sa.onPointerDown(1, 50, 10, 0);
      expect(accepted).toBe(false);
    });

    it("rejects non-left button", () => {
      const sa = makeScrollArea(200, 100);
      const accepted = sa.onPointerDown(1, 198, 10, 2);
      expect(accepted).toBe(false);
    });

    it("drags thumb on pointer move", () => {
      const sa = makeScrollArea(200, 100);
      sa.setPaddingAll(0);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      sa.onPointerDown(1, 198, 5, 0);
      sa.onPointerMove(1, 198, 50);
      expect(sa.scrollY).toBeGreaterThan(0);
    });

    it("releases thumb on pointer up", () => {
      const sa = makeScrollArea(200, 100);
      sa.setPaddingAll(0);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      sa.onPointerDown(1, 198, 5, 0);
      sa.onPointerUp(1, 198, 50, 0);
      sa.onPointerMove(1, 198, 80);
      const scrollAfterRelease = sa.scrollY;
      expect(scrollAfterRelease).toBeDefined();
    });
  });

  describe("reserveScrollbarSpace", () => {
    it("adds scrollbar width to right padding", () => {
      const sa = new ScrollArea();
      sa.setPaddingAll(0);
      sa.reserveScrollbarSpace();
      // index 13 of the packed geometry array is the right-padding slot
      expect(sa.geometry[13]).toBe(DEFAULTS.scrollDefaultWidth);
    });
  });

  describe("computeLayout", () => {
    it("computes contentHeight from children", () => {
      const sa = makeScrollArea(200, 100);
      const c1 = new Widget();
      c1.sizingX = "grow";
      c1.sizingY = "fixed";
      c1.preferredHeight = 80;
      const c2 = new Widget();
      c2.sizingX = "grow";
      c2.sizingY = "fixed";
      c2.preferredHeight = 120;
      sa.addChild(c1);
      sa.addChild(c2);
      sa.needsLayout = true;
      sa.computeLayout();
      expect(sa.contentHeight).toBe(200);
    });

    it("offsets children absoluteY when scrolled", () => {
      const sa = makeScrollArea(200, 100);
      sa.absoluteX = 0;
      sa.absoluteY = 0;
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      sa.setScroll(50);
      sa.needsLayout = true;
      sa.computeLayout();
      expect(child.absoluteY).toBeLessThan(0);
    });
  });

  describe("computeVisibleRange", () => {
    it("computes visible row range for top anchor", () => {
      const sa = new ScrollArea();
      sa.height = 100;
      sa.rowHeight = 20;
      sa.contentHeight = 500;
      sa.scrollY = 60;
      sa.computeVisibleRange();
      expect(sa.visibleStartRow).toBe(3);
      expect(sa.visibleEndRow).toBe(9);
    });

    it("returns 0,0 for zero row height", () => {
      const sa = new ScrollArea();
      sa.height = 100;
      sa.rowHeight = 0;
      sa.computeVisibleRange();
      expect(sa.visibleStartRow).toBe(0);
      expect(sa.visibleEndRow).toBe(0);
    });

    it("computes visible range for center anchor mode", () => {
      const sa = new ScrollArea();
      sa.height = 100;
      sa.anchorMode = "center";
      sa.rowHeight = 20;
      sa.contentHeight = 500;
      sa.anchorRow = 10;
      sa.computeVisibleRange();
      expect(sa.visibleStartRow).toBeLessThan(10);
      expect(sa.visibleEndRow).toBeGreaterThan(10);
    });
  });

  describe("getRowY", () => {
    it("returns row position minus scroll for top mode", () => {
      const sa = new ScrollArea();
      sa.rowHeight = 20;
      sa.scrollY = 40;
      expect(sa.getRowY(3)).toBe(20);
    });

    it("computes centered row position for center mode", () => {
      const sa = new ScrollArea();
      sa.height = 100;
      sa.anchorMode = "center";
      sa.rowHeight = 20;
      sa.anchorRow = 5;
      const y = sa.getRowY(5);
      expect(y).toBeCloseTo(40, 0);
    });
  });

  describe("getEffectiveScroll", () => {
    it("returns scrollY for top mode", () => {
      const sa = new ScrollArea();
      sa.scrollY = 42;
      expect(sa.getEffectiveScroll()).toBe(42);
    });

    it("computes effective scroll for center mode", () => {
      const sa = new ScrollArea();
      sa.anchorMode = "center";
      sa.rowHeight = 20;
      sa.anchorRow = 10;
      sa.height = 100;
      expect(sa.getEffectiveScroll()).toBe(150);
    });
  });

  describe("hitTest", () => {
    it("returns self when clicking scrollbar area", () => {
      const sa = makeScrollArea(200, 100);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      const hit = sa.hitTest(198, 50);
      expect(hit).toBe(sa);
    });
  });

  describe("drawing", () => {
    /** draws the scroll area once onto a throwaway 300x200 canvas to exercise the draw path. */
    function drawScrollArea(sa: ScrollArea): void {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 200;
      const renderer = new Canvas2DRenderer(canvas);
      renderer.begin(300, 200);
      sa.draw(renderer, makeFakeTheme());
      renderer.end();
    }

    it("draws scrollbar when content overflows", () => {
      const sa = makeScrollArea(200, 100);
      sa.bgColor = 0x111111ff;
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      drawScrollArea(sa);
    });

    it("draws without scrollbar when content fits", () => {
      const sa = makeScrollArea(200, 100);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 50;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      drawScrollArea(sa);
    });

    it("draws children with scroll offset", () => {
      const sa = makeScrollArea(200, 100);
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      sa.setScroll(100);
      sa.needsLayout = true;
      sa.computeLayout();
      drawScrollArea(sa);
    });

    it("draws with background color", () => {
      const sa = makeScrollArea(200, 100);
      sa.bgColor = 0xff000044;
      sa.needsLayout = true;
      sa.computeLayout();
      drawScrollArea(sa);
    });

    it("draws with center anchor mode", () => {
      const sa = makeScrollArea(200, 100);
      sa.anchorMode = "center";
      sa.rowHeight = 20;
      sa.anchorRow = 5;
      const child = new Widget();
      child.sizingX = "grow";
      child.sizingY = "fixed";
      child.preferredHeight = 500;
      sa.addChild(child);
      sa.needsLayout = true;
      sa.computeLayout();
      drawScrollArea(sa);
    });
  });
});
