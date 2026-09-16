import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { DEFAULTS } from "../../src/defaults";
import { GuiFolder } from "../../src/gui/gui-folder";
import { Box } from "../../src/widgets/box";
import { ScrollArea } from "../../src/widgets/scroll-area";
import { makeFakeInspectTheme } from "../test-helpers";

const CONTROL_COUNT = 10;
const CONTROL_HEIGHT = 20;
const CONTENT_HEIGHT = CONTROL_COUNT * CONTROL_HEIGHT;
const ANIMATION_SETTLE_MS = DEFAULTS.folderAnimDurationMs * 2;

type FakeTheme = ReturnType<typeof makeFakeInspectTheme>;

/** builds a 400x600 surface with a vertical-stack root, returning the surface, root, and theme. */
function createWidgetTree() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 600;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeInspectTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 400;
  root.height = 600;
  root.layout = new StackLayout("vertical", 4, "start", "stretch");
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 600;
  surface.flush();
  return { surface, root, theme };
}

/** a themed folder, collapsed before it joins the tree so no animation runs yet. */
function createCollapsedFolder(theme: FakeTheme, title: string, animated = true): GuiFolder {
  const folder = new GuiFolder();
  folder.id = title;
  folder.title = title;
  folder.animated = animated;
  folder.applyTheme(theme);
  folder.expanded = false;
  return folder;
}

/** fills a folder with fixed-height controls so its expanded height is known. */
function fillWithControls(folder: GuiFolder): void {
  for (let i = 0; i < CONTROL_COUNT; i++) {
    const control = new Box();
    control.sizingX = "grow";
    control.sizingY = "fixed";
    control.preferredHeight = CONTROL_HEIGHT;
    folder.addControl(control);
  }
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ANIMATION_SETTLE_MS));
}

function relayout(root: Box): void {
  root.needsLayout = true;
  root.computeLayout();
}

/** an outer folder holding an inner folder of controls, attached to the root and laid out. */
function createNestedPair(root: Box, theme: FakeTheme, animated = true) {
  const outer = createCollapsedFolder(theme, "outer", animated);
  const inner = createCollapsedFolder(theme, "inner", animated);
  fillWithControls(inner);
  outer.addControl(inner);
  root.addChild(outer);
  relayout(root);
  return { outer, inner };
}

describe("GuiFolder nested growth after animation", () => {
  it("grows to fit a nested folder that expands after the outer folder has animated", async () => {
    const { root, surface, theme } = createWidgetTree();
    const { outer, inner } = createNestedPair(root, theme);

    outer.expanded = true;
    await settle();
    relayout(root);
    const outerHeightWithInnerCollapsed = outer.height;

    inner.expanded = true;
    await settle();
    relayout(root);

    expect(inner.height).toBeGreaterThanOrEqual(theme.folderHeaderHeight + CONTENT_HEIGHT);
    expect(outer.measureIntrinsicHeight()).toBeGreaterThanOrEqual(outerHeightWithInnerCollapsed + CONTENT_HEIGHT);
    expect(outer.height).toBeGreaterThanOrEqual(outerHeightWithInnerCollapsed + CONTENT_HEIGHT);

    surface.dispose();
  });

  it("shrinks back to the collapsed-inner height when the nested folder collapses again", async () => {
    const { root, surface, theme } = createWidgetTree();
    const { outer, inner } = createNestedPair(root, theme);

    outer.expanded = true;
    await settle();
    relayout(root);
    const outerHeightWithInnerCollapsed = outer.height;

    inner.expanded = true;
    await settle();
    relayout(root);
    expect(outer.height).toBeGreaterThan(outerHeightWithInnerCollapsed);

    inner.expanded = false;
    await settle();
    relayout(root);
    expect(outer.height).toBe(outerHeightWithInnerCollapsed);

    surface.dispose();
  });

  it("grows every ancestor when a folder two levels deep expands", async () => {
    const { root, surface, theme } = createWidgetTree();
    const top = createCollapsedFolder(theme, "top");
    const middle = createCollapsedFolder(theme, "middle");
    const bottom = createCollapsedFolder(theme, "bottom");
    fillWithControls(bottom);
    middle.addControl(bottom);
    top.addControl(middle);
    root.addChild(top);
    relayout(root);

    top.expanded = true;
    await settle();
    middle.expanded = true;
    await settle();
    relayout(root);
    const topBefore = top.height;
    const middleBefore = middle.height;

    bottom.expanded = true;
    await settle();
    relayout(root);

    expect(bottom.height).toBeGreaterThanOrEqual(theme.folderHeaderHeight + CONTENT_HEIGHT);
    expect(middle.height).toBeGreaterThanOrEqual(middleBefore + CONTENT_HEIGHT);
    expect(top.height).toBeGreaterThanOrEqual(topBefore + CONTENT_HEIGHT);

    surface.dispose();
  });

  it("returns to fit sizing with no preferred height once an animation completes", async () => {
    const { root, surface, theme } = createWidgetTree();
    const { outer } = createNestedPair(root, theme);

    outer.expanded = true;
    expect(outer.sizingY).toBe("fixed");
    await settle();

    expect(outer.sizingY).toBe("fit");
    expect(outer.preferredHeight).toBe(0);

    outer.expanded = false;
    await settle();

    expect(outer.sizingY).toBe("fit");
    expect(outer.preferredHeight).toBe(0);

    surface.dispose();
  });

  it("keeps measuring its content after animations are cancelled by rapid toggling", async () => {
    const { root, surface, theme } = createWidgetTree();
    const { outer, inner } = createNestedPair(root, theme);

    outer.expanded = true;
    outer.expanded = false;
    outer.expanded = true;
    await settle();
    relayout(root);

    expect(outer.sizingY).toBe("fit");
    expect(outer.preferredHeight).toBe(0);
    const outerHeightWithInnerCollapsed = outer.height;

    inner.expanded = true;
    await settle();
    relayout(root);

    expect(outer.height).toBeGreaterThanOrEqual(outerHeightWithInnerCollapsed + CONTENT_HEIGHT);

    surface.dispose();
  });

  it("keeps measuring its content after several completed animations", async () => {
    const { root, surface, theme } = createWidgetTree();
    const { outer, inner } = createNestedPair(root, theme);

    for (let i = 0; i < 3; i++) {
      outer.expanded = true;
      await settle();
      outer.expanded = false;
      await settle();
    }
    outer.expanded = true;
    await settle();
    relayout(root);
    const outerHeightWithInnerCollapsed = outer.height;

    inner.expanded = true;
    await settle();
    relayout(root);

    expect(outer.height).toBeGreaterThanOrEqual(outerHeightWithInnerCollapsed + CONTENT_HEIGHT);

    surface.dispose();
  });

  it("leaves non-animated folders unchanged, growing synchronously on expand", () => {
    const { root, surface, theme } = createWidgetTree();
    const { outer, inner } = createNestedPair(root, theme, false);

    outer.expanded = true;
    relayout(root);
    const outerHeightWithInnerCollapsed = outer.height;
    expect(outer.preferredHeight).toBe(0);

    inner.expanded = true;
    relayout(root);

    expect(outer.preferredHeight).toBe(0);
    expect(outer.height).toBeGreaterThanOrEqual(outerHeightWithInnerCollapsed + CONTENT_HEIGHT);

    surface.dispose();
  });

  it("extends the scroll range of a scroll area when a nested folder expands", async () => {
    const { root, surface, theme } = createWidgetTree();
    const scrollArea = new ScrollArea();
    scrollArea.sizingX = "grow";
    scrollArea.sizingY = "fixed";
    scrollArea.preferredHeight = 120;
    scrollArea.layout = new StackLayout("vertical", theme.controlGap, "start", "stretch");
    root.addChild(scrollArea);

    const outer = createCollapsedFolder(theme, "outer");
    const inner = createCollapsedFolder(theme, "inner");
    fillWithControls(inner);
    outer.addControl(inner);
    scrollArea.addChild(outer);
    relayout(root);

    outer.expanded = true;
    await settle();
    relayout(root);
    expect(scrollArea.contentHeight).toBeLessThanOrEqual(scrollArea.height);
    scrollArea.setScroll(1000);
    expect(scrollArea.scrollY).toBe(0);

    inner.expanded = true;
    await settle();
    relayout(root);

    expect(scrollArea.contentHeight).toBeGreaterThan(scrollArea.height);
    scrollArea.setScroll(1000);
    expect(scrollArea.scrollY).toBeGreaterThan(0);

    surface.dispose();
  });
});
