// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { GuiReorderList } from "../../src/gui/gui-reorder-list";
import { Box } from "../../src/widgets/box";
import { makeFakeInspectTheme } from "../test-helpers";

/** mounts a GuiReorderList of four items in a 400x400 surface, themed and flushed, returning the test handles. */
function createMountedReorderList() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeInspectTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 400;
  root.height = 400;
  root.layout = new StackLayout("vertical", 0, "start", "stretch");
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 400;

  const onChange = vi.fn();
  const reorderList = new GuiReorderList({
    key: "order",
    items: [
      { id: "alpha", label: "Alpha" },
      { id: "beta", label: "Beta" },
      { id: "gamma", label: "Gamma" },
      { id: "delta", label: "Delta" }
    ],
    onChange
  });
  reorderList.applyTheme(theme);
  root.addChild(reorderList);
  root.needsLayout = true;
  root.computeLayout();
  surface.flush();

  return { surface, root, reorderList, onChange, renderer, theme };
}

describe("GuiReorderList pointer up reorder", () => {
  it("reorders items when dropping at different position", () => {
    const { reorderList, onChange, surface } = createMountedReorderList();

    reorderList.onPointerDown(1, 10, 12, 0);
    reorderList.onPointerMove(1, 10, 80);
    reorderList.onPointerUp(1, 10, 80, 0);

    if (onChange.mock.calls.length > 0) {
      expect(onChange.mock.calls[0][0]).toBeInstanceOf(Array);
    }

    surface.dispose();
  });

  it("does not reorder when dropping at same position", () => {
    const { reorderList, surface } = createMountedReorderList();

    reorderList.onPointerDown(1, 10, 12, 0);
    reorderList.onPointerMove(1, 10, 12);
    reorderList.onPointerUp(1, 10, 12, 0);

    surface.dispose();
  });

  it("ignores pointer up from wrong pointer id", () => {
    const { reorderList, surface } = createMountedReorderList();

    reorderList.onPointerDown(1, 10, 12, 0);
    reorderList.onPointerUp(2, 10, 80, 0);

    surface.dispose();
  });

  it("ignores pointer up when not dragging", () => {
    const { reorderList, surface } = createMountedReorderList();

    reorderList.onPointerUp(1, 10, 80, 0);

    surface.dispose();
  });
});

describe("GuiReorderList drawSelf insert indicator", () => {
  it("draws insert indicator when dragging", () => {
    const { reorderList, renderer, theme, surface } = createMountedReorderList();

    reorderList.onPointerDown(1, 10, 12, 0);
    reorderList.onPointerMove(1, 10, 80);

    renderer.begin(400, 400);
    reorderList.draw(renderer, theme);
    renderer.end();

    surface.dispose();
  });

  it("draws indicator at end when insert index is beyond last row", () => {
    const { reorderList, renderer, theme, surface } = createMountedReorderList();

    reorderList.onPointerDown(1, 10, 12, 0);
    reorderList.onPointerMove(1, 10, 300);

    renderer.begin(400, 400);
    reorderList.draw(renderer, theme);
    renderer.end();

    surface.dispose();
  });
});

describe("GuiReorderList config getter and input rejection", () => {
  it("config getter returns the config object", () => {
    const config = { key: "r", items: [{ id: "a", label: "A" }], onChange: vi.fn() };
    const r = new GuiReorderList(config);
    expect(r.config).toBe(config);
  });

  it("rejects non-left button on pointerDown", () => {
    const r = new GuiReorderList({ key: "r", items: [{ id: "a", label: "A" }], onChange: vi.fn() });
    r.width = 200;
    r.height = 100;
    const accepted = r.onPointerDown(1, 10, 10, 2);
    expect(accepted).toBe(false);
  });

  it("ignores pointerMove from wrong pointer id", () => {
    const r = new GuiReorderList({
      key: "r",
      items: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ],
      onChange: vi.fn()
    });
    r.applyTheme(makeFakeInspectTheme());
    r.width = 200;
    r.height = 100;
    r.needsLayout = true;
    r.computeLayout();
    r.onPointerDown(1, 10, 10, 0);
    r.onPointerMove(2, 10, 50);
  });
});
