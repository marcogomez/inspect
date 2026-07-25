// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { beforeEach, describe, expect, it } from "vitest";

import { Inspect } from "../src/Inspect";

describe("Inspect singleton (canvas)", () => {
  beforeEach(() => {
    Inspect.dispose();
  });

  describe("mount lifecycle", () => {
    it("mounts to a container", () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      expect(Inspect.isMounted()).toBe(true);
      Inspect.dispose();
    });

    it("does not double-mount", () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.mount(container);
      expect(Inspect.isMounted()).toBe(true);
      Inspect.dispose();
    });

    it("isMounted returns false before mount", () => {
      expect(Inspect.isMounted()).toBe(false);
    });

    it("dispose cleans up", () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.dispose();
      expect(Inspect.isMounted()).toBe(false);
    });
  });

  describe("folder registration", () => {
    it("registers folder before mount", () => {
      Inspect.registerFolder({ id: "f1", title: "Folder", controls: [] });
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.dispose();
    });

    it("registers folder after mount", () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.registerFolder({ id: "f1", title: "Folder", controls: [] });
      Inspect.dispose();
    });

    it("registers multiple folders", () => {
      Inspect.registerFolders([
        { id: "f1", title: "F1", controls: [] },
        { id: "f2", title: "F2", controls: [] }
      ]);
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.dispose();
    });

    it("unregisters folder", () => {
      Inspect.registerFolder({ id: "f1", title: "F1", controls: [] });
      Inspect.unregisterFolder("f1");
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.dispose();
    });

    it("unregisters multiple folders", () => {
      Inspect.registerFolders([
        { id: "f1", title: "F1", controls: [] },
        { id: "f2", title: "F2", controls: [] }
      ]);
      Inspect.unregisterFolders(["f1", "f2"]);
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.dispose();
    });
  });

  describe("tab registration", () => {
    it("registers tabs", () => {
      Inspect.registerTabs([
        { title: "Tab 1", folders: [{ id: "f1", title: "F1", controls: [] }] },
        { title: "Tab 2", folders: [{ id: "f2", title: "F2", controls: [] }] }
      ]);
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.dispose();
    });
  });

  describe("visibility", () => {
    it("starts hidden by default", () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      expect(Inspect.isVisible()).toBe(false);
      Inspect.dispose();
    });

    it("toggle changes visibility", () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.toggle();
      expect(Inspect.isVisible()).toBe(true);
      Inspect.toggle();
      expect(Inspect.isVisible()).toBe(false);
      Inspect.dispose();
    });

    it("show/hide control visibility", () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.show();
      expect(Inspect.isVisible()).toBe(true);
      Inspect.hide();
      expect(Inspect.isVisible()).toBe(false);
      Inspect.dispose();
    });

    it("isVisible returns false when not mounted", () => {
      expect(Inspect.isVisible()).toBe(false);
    });
  });

  describe("update", () => {
    it("update does nothing when not mounted", () => {
      Inspect.update();
    });

    it("update does nothing when hidden", () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      Inspect.update();
      Inspect.dispose();
    });
  });

  describe("accessors", () => {
    it("getFolder returns undefined when not mounted", () => {
      expect(Inspect.getFolder("x")).toBeUndefined();
    });

    it("getCustomControl returns undefined when not mounted", () => {
      expect(Inspect.getCustomControl("x")).toBeUndefined();
    });

    it("getReorderList returns null when not mounted", () => {
      expect(Inspect.getReorderList("x")).toBeNull();
    });

    it("getPane returns null", () => {
      expect(Inspect.getPane()).toBeNull();
    });

    it("isActive returns false when not mounted", () => {
      expect(Inspect.isActive()).toBe(false);
    });
  });

  describe("mount with toggle button", () => {
    it("creates toggle icon when showToggleButton is true", () => {
      const container = document.createElement("div");
      Inspect.mount(container, { showToggleButton: true });
      Inspect.dispose();
    });
  });

  describe("rebuild with font atlas (async)", () => {
    /** reaches the singleton's private panel so tests can await panel.ready. */
    function getPanel(): import("../src/panel/inspect-panel").InspectPanel | null {
      return (Inspect as unknown as { panel: import("../src/panel/inspect-panel").InspectPanel | null }).panel;
    }

    it("rebuilds folders after panel.ready resolves", async () => {
      Inspect.registerFolder({
        id: "f1",
        title: "Test Folder",
        controls: [{ type: "separator", config: { key: "sep" } as never }]
      });
      const container = document.createElement("div");
      Inspect.mount(container);
      const panel = getPanel();
      expect(panel).not.toBeNull();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      expect(Inspect.getFolder("f1")).toBeDefined();
      Inspect.dispose();
    });

    it("rebuilds tabs after panel.ready resolves", async () => {
      Inspect.registerTabs([
        {
          title: "Tab A",
          folders: [{ id: "fa", title: "FA", controls: [] }]
        },
        {
          title: "Tab B",
          folders: [{ id: "fb", title: "FB", controls: [] }]
        }
      ]);
      const container = document.createElement("div");
      Inspect.mount(container);
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      expect(Inspect.getFolder("fa")).toBeDefined();
      expect(Inspect.getFolder("fb")).toBeDefined();
      Inspect.dispose();
    });

    it("rebuilds with parent-child folder hierarchy", async () => {
      Inspect.registerFolders([
        { id: "parent", title: "Parent", controls: [] },
        { id: "child", title: "Child", parent: "parent", controls: [] }
      ]);
      const container = document.createElement("div");
      Inspect.mount(container);
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      expect(Inspect.getFolder("parent")).toBeDefined();
      expect(Inspect.getFolder("child")).toBeDefined();
      Inspect.dispose();
    });

    it("rebuilds with slider and monitor controls", async () => {
      let val = 50;
      Inspect.registerFolder({
        id: "f1",
        title: "F",
        controls: [
          {
            type: "slider",
            config: {
              key: "s",
              min: 0,
              max: 100,
              step: 1,
              value: () => val,
              onChange: (v: number) => {
                val = v;
              }
            }
          },
          { type: "monitor", config: { key: "m", value: () => 60 } }
        ]
      });
      const container = document.createElement("div");
      Inspect.mount(container);
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      Inspect.show();
      Inspect.update();
      Inspect.dispose();
    });

    it("rebuilds with showImportExport option", async () => {
      Inspect.registerFolder({ id: "f1", title: "F", controls: [] });
      const container = document.createElement("div");
      Inspect.mount(container, { showImportExport: true });
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      Inspect.dispose();
    });

    it("rebuilds tabs with showImportExport per tab", async () => {
      Inspect.registerTabs([
        {
          title: "Tab A",
          folders: [{ id: "fa", title: "FA", controls: [] }],
          showImportExport: true
        }
      ]);
      const container = document.createElement("div");
      Inspect.mount(container);
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      Inspect.dispose();
    });

    it("registers folder after mount triggers rebuild", async () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      Inspect.registerFolder({ id: "late", title: "Late", controls: [] });
      expect(Inspect.getFolder("late")).toBeDefined();
      Inspect.dispose();
    });

    it("unregisters folder after mount triggers rebuild", async () => {
      Inspect.registerFolder({ id: "f1", title: "F1", controls: [] });
      const container = document.createElement("div");
      Inspect.mount(container);
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      Inspect.unregisterFolder("f1");
      expect(Inspect.getFolder("f1")).toBeUndefined();
      Inspect.dispose();
    });

    it("keyboard toggle works after mount", async () => {
      const container = document.createElement("div");
      Inspect.mount(container, { persistVisibility: false, initiallyVisible: false });
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      expect(Inspect.isVisible()).toBe(false);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));
      expect(Inspect.isVisible()).toBe(true);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "p" }));
      expect(Inspect.isVisible()).toBe(false);
      Inspect.dispose();
    });

    it("keyboard toggle ignores input/textarea/select targets", async () => {
      const container = document.createElement("div");
      Inspect.mount(container, { persistVisibility: false, initiallyVisible: false });
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      expect(Inspect.isVisible()).toBe(false);
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true }));
      expect(Inspect.isVisible()).toBe(false);
      input.remove();
      Inspect.dispose();
    });

    it("isActive checks panel state", async () => {
      const container = document.createElement("div");
      Inspect.mount(container);
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      expect(Inspect.isActive()).toBe(false);
      Inspect.dispose();
    });

    it("mount with tabBarReservedEdge option", async () => {
      Inspect.registerTabs([{ title: "Tab", folders: [{ id: "f1", title: "F1", controls: [] }] }]);
      const container = document.createElement("div");
      Inspect.mount(container, { tabBarReservedEdge: 40 });
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      Inspect.dispose();
    });

    it("mount with showToggleButton sets reservedEdge on tabs", async () => {
      Inspect.registerTabs([{ title: "Tab", folders: [{ id: "f1", title: "F1", controls: [] }] }]);
      const container = document.createElement("div");
      Inspect.mount(container, { showToggleButton: true, toggleButtonSize: 25 });
      const panel = getPanel();
      if (!panel) {
        throw new Error("expected a mounted panel");
      }
      await panel.ready;
      Inspect.dispose();
    });
  });
});
