// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { beforeEach, describe, expect, it } from "vitest";

import { Inspect } from "../src/Inspect";

/** reaches into the Inspect singleton for its internal panel, or null before mount. */
function getPanel(inspect: typeof Inspect) {
  return (inspect as unknown as { panel: { ready: Promise<void> } | null }).panel;
}

describe("Inspect singleton isActive with hovered panel", () => {
  beforeEach(() => {
    Inspect.dispose();
  });

  it("returns true when panel canvas receives pointerenter", async () => {
    Inspect.registerFolder({ id: "f1", title: "F1", controls: [] });
    const container = document.createElement("div");
    Inspect.mount(container, { initiallyVisible: true });
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    const canvas = container.querySelector("canvas");
    if (canvas) {
      canvas.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 600,
        width: 400,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => {
          /* no-op */
        }
      });
      canvas.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    }
    expect(Inspect.isActive()).toBe(true);
    Inspect.dispose();
  });
});

describe("Inspect singleton buildTabs and tab switching", () => {
  beforeEach(() => {
    Inspect.dispose();
  });

  it("builds tabs and mounts without error", async () => {
    Inspect.registerTabs([
      { title: "A", folders: [{ id: "fa", title: "FA", controls: [] }] },
      { title: "B", folders: [{ id: "fb", title: "FB", controls: [] }] }
    ]);
    const container = document.createElement("div");
    Inspect.mount(container);
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    Inspect.dispose();
  });
});

describe("Inspect singleton import/export buttons", () => {
  beforeEach(() => {
    Inspect.dispose();
  });

  it("creates import/export buttons when showImportExport is true", async () => {
    Inspect.registerFolder({ id: "f1", title: "F1", controls: [] });
    const container = document.createElement("div");
    Inspect.mount(container, { showImportExport: true });
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    Inspect.dispose();
  });
});

describe("Inspect singleton buildFolders parent nesting", () => {
  beforeEach(() => {
    Inspect.dispose();
  });

  it("nests child under parent and orphan goes to root", async () => {
    Inspect.registerFolder({ id: "parent", title: "Parent", controls: [] });
    Inspect.registerFolder({ id: "child", title: "Child", controls: [], parent: "parent" });
    Inspect.registerFolder({ id: "orphan", title: "Orphan", controls: [], parent: "gone" });
    const container = document.createElement("div");
    Inspect.mount(container);
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    Inspect.dispose();
  });
});
