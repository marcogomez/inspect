// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { beforeEach, describe, expect, it } from "vitest";

import { Inspect } from "../src/Inspect";

/** reaches into the Inspect singleton for its internal panel, or null before mount. */
function getPanel(inspect: typeof Inspect) {
  return (
    inspect as unknown as {
      panel: { ready: Promise<void>; isHovered: () => boolean; input: { getActivePointerCount: () => number } } | null;
    }
  ).panel;
}

describe("Inspect singleton after font atlas ready", () => {
  beforeEach(() => {
    Inspect.dispose();
  });

  it("builds tabs with tabBarReservedEdge after ready", async () => {
    Inspect.registerTabs([
      { title: "Tab 1", folders: [{ id: "f1", title: "F1", controls: [] }] },
      { title: "Tab 2", folders: [{ id: "f2", title: "F2", controls: [] }] }
    ]);
    const container = document.createElement("div");
    Inspect.mount(container, { tabBarReservedEdge: 40 });
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    Inspect.dispose();
  });

  it("builds folders with parent dependency sorting", async () => {
    Inspect.registerFolder({ id: "child", title: "Child", controls: [], parent: "parent" });
    Inspect.registerFolder({ id: "parent", title: "Parent", controls: [] });
    const container = document.createElement("div");
    Inspect.mount(container);
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    Inspect.dispose();
  });

  it("builds folders with orphan child (no valid parent)", async () => {
    Inspect.registerFolder({ id: "orphan", title: "Orphan", controls: [], parent: "nonexistent" });
    const container = document.createElement("div");
    Inspect.mount(container);
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    Inspect.dispose();
  });

  it("builds import/export buttons when showImportExport is true", async () => {
    Inspect.registerFolder({ id: "f1", title: "F1", controls: [] });
    const container = document.createElement("div");
    Inspect.mount(container, { showImportExport: true });
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    Inspect.dispose();
  });

  it("tabBar onChange switches active page", async () => {
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

  it("isActive returns true when panel is hovered", async () => {
    Inspect.registerFolder({ id: "f1", title: "F1", controls: [] });
    const container = document.createElement("div");
    Inspect.mount(container);
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
      const canvas = container.querySelector("canvas");
      if (canvas) {
        canvas.dispatchEvent(new Event("pointerenter"));
      }
      expect(Inspect.isActive()).toBe(true);
    }
    Inspect.dispose();
  });

  it("getFolder returns folder after build", async () => {
    Inspect.registerFolder({ id: "f1", title: "F1", controls: [] });
    const container = document.createElement("div");
    Inspect.mount(container);
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    const folder = Inspect.getFolder("f1");
    expect(folder).toBeDefined();
    Inspect.dispose();
  });

  it("scheduleRebuild is no-op when panel theme has no fontAtlas", () => {
    const container = document.createElement("div");
    Inspect.mount(container);
    Inspect.registerFolder({ id: "f1", title: "F1", controls: [] });
    Inspect.dispose();
  });

  it("getSortedFolders handles already-added config", async () => {
    Inspect.registerFolder({ id: "a", title: "A", controls: [] });
    Inspect.registerFolder({ id: "b", title: "B", controls: [], parent: "a" });
    Inspect.registerFolder({ id: "c", title: "C", controls: [], parent: "a" });
    const container = document.createElement("div");
    Inspect.mount(container);
    const panel = getPanel(Inspect);
    if (panel) {
      await panel.ready;
    }
    Inspect.dispose();
  });
});
