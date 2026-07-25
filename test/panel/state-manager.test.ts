import { describe, expect, it, vi } from "vitest";

import { Widget } from "../../src/core/widget";
import { GuiFolder } from "../../src/gui/gui-folder";
import { GuiMonitor } from "../../src/gui/gui-monitor";
import { StateManager } from "../../src/panel/state-manager";

/**
 * builds a stand-in WidgetBuilder exposing only the maps StateManager reads.
 * monitors and folders come from opts; the remaining maps default to empty.
 */
function makeFakeBuilder(opts: {
  monitors?: Map<string, { widget: GuiMonitor; config: { key: string; value: () => unknown } }>;
  folders?: Map<string, GuiFolder>;
}) {
  return {
    monitors: opts.monitors ?? new Map(),
    folders: opts.folders ?? new Map(),
    textLogs: new Map(),
    customControls: new Map(),
    reorderLists: new Map()
  };
}

describe("StateManager", () => {
  describe("exportState", () => {
    it("exports monitor values", () => {
      const sm = new StateManager();
      const monitor = new GuiMonitor({ key: "fps", label: "FPS", value: () => 60 });
      const builder = makeFakeBuilder({
        monitors: new Map([["fps", { widget: monitor, config: { key: "fps", value: () => 60 } }]])
      });
      const state = sm.exportState(builder as never);
      expect(state.fps).toBe(60);
    });

    it("exports folder direct children with config.key and config.value", () => {
      const sm = new StateManager();
      const folder = new GuiFolder();
      const child = new Widget() as Widget & { config: { key: string; value: () => number } };
      (child as unknown as Record<string, unknown>).config = { key: "brightness", value: () => 0.8 };
      folder.addChild(child);
      const builder = makeFakeBuilder({
        folders: new Map([["f1", folder]])
      });
      const state = sm.exportState(builder as never);
      expect(state.brightness).toBe(0.8);
    });

    it("skips children without config", () => {
      const sm = new StateManager();
      const folder = new GuiFolder();
      folder.addControl(new Widget());
      const builder = makeFakeBuilder({
        folders: new Map([["f1", folder]])
      });
      const state = sm.exportState(builder as never);
      expect(Object.keys(state)).toHaveLength(0);
    });

    it("returns empty object for empty builder", () => {
      const sm = new StateManager();
      const builder = makeFakeBuilder({});
      const state = sm.exportState(builder as never);
      expect(state).toEqual({});
    });
  });

  describe("importState", () => {
    it("calls onChange and refresh on matching folder direct children", () => {
      const sm = new StateManager();
      const onChange = vi.fn();
      const refresh = vi.fn();
      const folder = new GuiFolder();
      const child = new Widget() as Widget & {
        config: { key: string; onChange: (v: unknown) => void };
        refresh: () => void;
      };
      (child as unknown as Record<string, unknown>).config = { key: "brightness", onChange };
      (child as unknown as Record<string, unknown>).refresh = refresh;
      folder.addChild(child);
      const builder = makeFakeBuilder({
        folders: new Map([["f1", folder]])
      });
      sm.importState(builder as never, { brightness: 0.5 });
      expect(onChange).toHaveBeenCalledWith(0.5);
      expect(refresh).toHaveBeenCalled();
    });

    it("skips children without matching key in state", () => {
      const sm = new StateManager();
      const onChange = vi.fn();
      const folder = new GuiFolder();
      const child = new Widget() as Widget & { config: { key: string; onChange: (v: unknown) => void } };
      (child as unknown as Record<string, unknown>).config = { key: "brightness", onChange };
      folder.addChild(child);
      const builder = makeFakeBuilder({
        folders: new Map([["f1", folder]])
      });
      sm.importState(builder as never, { contrast: 1.0 });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("refreshes monitors with matching keys", () => {
      const sm = new StateManager();
      let val = 60;
      const monitor = new GuiMonitor({ key: "fps", label: "FPS", value: () => val });
      const builder = makeFakeBuilder({
        monitors: new Map([["fps", { widget: monitor, config: { key: "fps", value: () => val } }]])
      });
      val = 30;
      sm.importState(builder as never, { fps: 30 });
    });
  });
});
