// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { InspectRegistry } from "../src/InspectRegistry";

import type { FolderConfig } from "../src/types";

/** builds an empty FolderConfig whose title mirrors its id. */
function makeFolder(id: string): FolderConfig {
  return { id, title: id, controls: [] };
}

describe("InspectRegistry", () => {
  describe("folder registration", () => {
    it("registers a folder", () => {
      const reg = new InspectRegistry();
      reg.registerFolder(makeFolder("f1"));
    });

    it("registers multiple folders", () => {
      const reg = new InspectRegistry();
      reg.registerFolders([makeFolder("f1"), makeFolder("f2")]);
    });

    it("returns this for chaining", () => {
      const reg = new InspectRegistry();
      const result = reg.registerFolder(makeFolder("f1"));
      expect(result).toBe(reg);
    });

    it("unregisters a folder", () => {
      const reg = new InspectRegistry();
      reg.registerFolder(makeFolder("f1"));
      const result = reg.unregisterFolder("f1");
      expect(result).toBe(reg);
    });

    it("clears all folders", () => {
      const reg = new InspectRegistry();
      reg.registerFolders([makeFolder("f1"), makeFolder("f2")]);
      const result = reg.clearFolders();
      expect(result).toBe(reg);
    });
  });

  describe("mount / dispose lifecycle", () => {
    it("mounts to a container", () => {
      const reg = new InspectRegistry();
      reg.registerFolder(makeFolder("f1"));
      const container = document.createElement("div");
      reg.mount(container);
      expect(container.querySelector("canvas")).not.toBeNull();
      reg.dispose();
    });

    it("does not mount twice", () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.mount(container);
      reg.mount(container);
      reg.dispose();
    });

    it("dispose cleans up", () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.mount(container);
      reg.dispose();
      expect(container.querySelector("canvas")).toBeNull();
    });

    it("can remount after dispose", () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.registerFolder(makeFolder("f1"));
      reg.mount(container);
      reg.dispose();
      reg.mount(container);
      expect(container.querySelector("canvas")).not.toBeNull();
      reg.dispose();
    });
  });

  describe("visibility", () => {
    it("toggle changes visibility", () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.mount(container);
      expect(reg.isVisible()).toBe(false);
      reg.toggle();
      expect(reg.isVisible()).toBe(true);
      reg.toggle();
      expect(reg.isVisible()).toBe(false);
      reg.dispose();
    });

    it("show/hide control visibility", () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.mount(container);
      reg.show();
      expect(reg.isVisible()).toBe(true);
      reg.hide();
      expect(reg.isVisible()).toBe(false);
      reg.dispose();
    });
  });

  describe("update", () => {
    it("update runs without error when mounted", () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.registerFolder({
        id: "f1",
        title: "F1",
        controls: [{ type: "monitor", config: { key: "fps", label: "FPS", value: () => 60 } }]
      });
      reg.mount(container, { initiallyVisible: true });
      reg.update();
      reg.dispose();
    });

    it("update does nothing when not mounted", () => {
      const reg = new InspectRegistry();
      reg.update();
    });
  });

  describe("getFolder", () => {
    it("returns undefined immediately after mount (async font loading)", () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.registerFolder(makeFolder("f1"));
      reg.mount(container);
      const folder = reg.getFolder("f1");
      expect(folder).toBeUndefined();
      reg.dispose();
    });

    it("returns undefined for unknown folder", () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.mount(container);
      expect(reg.getFolder("nonexistent")).toBeUndefined();
      reg.dispose();
    });

    it("returns undefined when not mounted", () => {
      const reg = new InspectRegistry();
      expect(reg.getFolder("f1")).toBeUndefined();
    });
  });

  describe("rebuild with font atlas (async)", () => {
    /** reaches into the registry for its internal panel, or null before mount. */
    function getPanel(reg: InspectRegistry): import("../src/panel/inspect-panel").InspectPanel | null {
      return (reg as unknown as { panel: import("../src/panel/inspect-panel").InspectPanel | null }).panel;
    }

    it("rebuilds after panel.ready resolves", async () => {
      const reg = new InspectRegistry();
      reg.registerFolder({
        id: "f1",
        title: "Test",
        controls: [{ type: "separator", config: { key: "sep" } as never }]
      });
      const container = document.createElement("div");
      reg.mount(container);
      const panel = getPanel(reg);
      if (!panel) {
        throw new Error("expected the registry to have a panel");
      }
      await panel.ready;
      expect(reg.getFolder("f1")).toBeDefined();
      reg.dispose();
    });

    it("update refreshes monitors when visible", async () => {
      const reg = new InspectRegistry();
      let val = 60;
      reg.registerFolder({
        id: "f1",
        title: "F",
        controls: [{ type: "monitor", config: { key: "fps", value: () => val } }]
      });
      const container = document.createElement("div");
      reg.mount(container, { initiallyVisible: true, persistVisibility: false });
      const panel = getPanel(reg);
      if (!panel) {
        throw new Error("expected the registry to have a panel");
      }
      await panel.ready;
      reg.show();
      val = 30;
      reg.update();
      reg.dispose();
    });

    it("isActive checks panel state", async () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.mount(container);
      const panel = getPanel(reg);
      if (!panel) {
        throw new Error("expected the registry to have a panel");
      }
      await panel.ready;
      expect(reg.isActive()).toBe(false);
      reg.dispose();
    });

    it("getCustomControl returns undefined for unknown key", async () => {
      const reg = new InspectRegistry();
      const container = document.createElement("div");
      reg.mount(container);
      const panel = getPanel(reg);
      if (!panel) {
        throw new Error("expected the registry to have a panel");
      }
      await panel.ready;
      expect(reg.getCustomControl("x")).toBeUndefined();
      reg.dispose();
    });
  });
});
