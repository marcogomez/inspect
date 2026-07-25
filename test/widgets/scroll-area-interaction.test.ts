// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { Box } from "../../src/widgets/box";
import { ScrollArea } from "../../src/widgets/scroll-area";
import { makeFakeTheme } from "../test-helpers";

/**
 * mounts a grow-sized ScrollArea filled with 20px rows summing to
 * totalContentHeight inside a laid-out 200x100 surface, then flushes. content
 * taller than 100px overflows so the scrollbar and drag paths become active.
 */
function createScrollAreaWithContent(totalContentHeight: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 100;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 200;
  root.height = 100;
  root.layout = new StackLayout("vertical", 0, "start", "stretch");
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 200;
  (surface as unknown as { _height: number })._height = 100;

  const scrollArea = new ScrollArea();
  scrollArea.sizingX = "grow";
  scrollArea.sizingY = "grow";
  scrollArea.flexGrow = 1;
  scrollArea.layout = new StackLayout("vertical", 0, "start", "stretch");
  root.addChild(scrollArea);

  const rows = Math.ceil(totalContentHeight / 20);
  for (let i = 0; i < rows; i++) {
    const item = new Box();
    item.sizingX = "grow";
    item.sizingY = "fixed";
    item.preferredHeight = 20;
    scrollArea.addChild(item);
  }

  root.needsLayout = true;
  root.computeLayout();
  surface.flush();

  scrollArea.contentHeight = totalContentHeight;

  return { surface, scrollArea, renderer, theme, root };
}

describe("ScrollArea hitTest", () => {
  it("returns self when clicking scrollbar area", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    const hit = scrollArea.hitTest(scrollArea.width - 2, 50);
    expect(hit).toBe(scrollArea);
    surface.dispose();
  });

  it("returns null when not visible", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.visible = false;
    const hit = scrollArea.hitTest(50, 50);
    expect(hit).toBeNull();
    surface.dispose();
  });

  it("hitTest returns child when click is within child bounds", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    const hit = scrollArea.hitTest(50, 10);
    expect(hit).not.toBeNull();
    surface.dispose();
  });

  it("hitTest with center anchor uses 0 offset", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.anchorMode = "center";
    scrollArea.contentHeight = 400;
    const hit = scrollArea.hitTest(50, 50);
    expect(hit).not.toBeNull();
    surface.dispose();
  });

  it("hitTest skips invisible children", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    for (const child of scrollArea.children) {
      child.visible = false;
    }
    const hit = scrollArea.hitTest(50, 10);
    expect(hit).toBe(scrollArea);
    surface.dispose();
  });
});

describe("ScrollArea scrollbar drag", () => {
  it("starts thumb drag on scrollbar pointer down", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    const accepted = scrollArea.onPointerDown(1, scrollArea.width - 2, 10, 0);
    expect(accepted).toBe(true);
    surface.dispose();
  });

  it("rejects non-left button", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    const accepted = scrollArea.onPointerDown(1, scrollArea.width - 2, 10, 2);
    expect(accepted).toBe(false);
    surface.dispose();
  });

  it("rejects when content does not overflow", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(50);
    scrollArea.contentHeight = 50;
    const accepted = scrollArea.onPointerDown(1, scrollArea.width - 2, 10, 0);
    expect(accepted).toBe(false);
    surface.dispose();
  });

  it("rejects when clicking content area not scrollbar", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    const accepted = scrollArea.onPointerDown(1, 10, 10, 0);
    expect(accepted).toBe(false);
    surface.dispose();
  });

  it("pointer move during thumb drag updates scroll", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    scrollArea.onPointerDown(1, scrollArea.width - 2, 10, 0);
    scrollArea.onPointerMove(1, scrollArea.width - 2, 50);
    expect(scrollArea.scrollY).toBeGreaterThan(0);
    surface.dispose();
  });

  it("pointer move from wrong id is ignored", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    scrollArea.onPointerDown(1, scrollArea.width - 2, 10, 0);
    scrollArea.onPointerMove(2, scrollArea.width - 2, 50);
    expect(scrollArea.scrollY).toBe(0);
    surface.dispose();
  });

  it("pointer up ends thumb drag", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.contentHeight = 400;
    scrollArea.onPointerDown(1, scrollArea.width - 2, 10, 0);
    scrollArea.onPointerUp(1, scrollArea.width - 2, 50, 0);
    scrollArea.onPointerMove(1, scrollArea.width - 2, 80);
    surface.dispose();
  });
});

describe("ScrollArea center anchor mode", () => {
  it("wheel in center mode adjusts manualScrollOffset", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.anchorMode = "center";
    scrollArea.contentHeight = 400;
    const handled = scrollArea.onWheel(0, 50);
    expect(handled).toBe(true);
    surface.dispose();
  });

  it("computeVisibleRange with center anchor", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.anchorMode = "center";
    scrollArea.contentHeight = 400;
    scrollArea.rowHeight = 20;
    scrollArea.anchorRow = 10;
    scrollArea.computeVisibleRange();
    expect(scrollArea.visibleStartRow).toBeGreaterThanOrEqual(0);
    expect(scrollArea.visibleEndRow).toBeGreaterThan(scrollArea.visibleStartRow);
    surface.dispose();
  });

  it("getRowY with center anchor", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.anchorMode = "center";
    scrollArea.rowHeight = 20;
    scrollArea.anchorRow = 5;
    const y = scrollArea.getRowY(5);
    expect(typeof y).toBe("number");
    surface.dispose();
  });

  it("getEffectiveScroll with center anchor", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.anchorMode = "center";
    scrollArea.rowHeight = 20;
    scrollArea.anchorRow = 10;
    const s = scrollArea.getEffectiveScroll();
    expect(s).toBeGreaterThan(0);
    surface.dispose();
  });

  it("drawChildren in center mode clips visible children", () => {
    const { scrollArea, renderer, theme, surface } = createScrollAreaWithContent(400);
    scrollArea.anchorMode = "center";
    scrollArea.contentHeight = 400;
    renderer.begin(200, 100);
    scrollArea.draw(renderer, theme);
    renderer.end();
    surface.dispose();
  });
});

describe("ScrollArea computeVisibleRange edge cases", () => {
  it("returns 0,0 when rowHeight is 0", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(400);
    scrollArea.rowHeight = 0;
    scrollArea.computeVisibleRange();
    expect(scrollArea.visibleStartRow).toBe(0);
    expect(scrollArea.visibleEndRow).toBe(0);
    surface.dispose();
  });
});

describe("ScrollArea nested children absoluteY offset", () => {
  it("traverses nested children when offsetting absoluteY", () => {
    const { scrollArea, renderer, theme, surface } = createScrollAreaWithContent(200);
    scrollArea.contentHeight = 200;
    scrollArea.scrollY = 30;
    scrollArea.needsLayout = true;
    scrollArea.computeLayout();
    renderer.begin(200, 100);
    scrollArea.draw(renderer, theme);
    renderer.end();
    surface.dispose();
  });

  it("pointer move returns early when trackRange <= 0", () => {
    const { scrollArea, surface } = createScrollAreaWithContent(102);
    scrollArea.contentHeight = 102;
    scrollArea.onPointerDown(1, scrollArea.width - 2, 5, 0);
    scrollArea.onPointerMove(1, scrollArea.width - 2, 50);
    surface.dispose();
  });
});
