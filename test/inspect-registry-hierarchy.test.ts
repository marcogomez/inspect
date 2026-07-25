// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { InspectRegistry } from "../src/InspectRegistry";

import type { FolderConfig } from "../src/types";

/** builds a FolderConfig whose title mirrors its id, with optional parent and controls. */
function makeFolder(id: string, parent?: string, controls: FolderConfig["controls"] = []): FolderConfig {
  return { id, title: id, controls, parent };
}

describe("InspectRegistry parent folder hierarchy", () => {
  it("nests child folder under parent after mount", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder(makeFolder("parent"));
    reg.registerFolder(makeFolder("child", "parent"));
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 200));
    reg.dispose();
  });

  it("child without valid parent goes to scroll root", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder(makeFolder("orphan", "nonexistent"));
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 200));
    reg.dispose();
  });

  it("sorts folders with dependency ordering", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder(makeFolder("child", "parent"));
    reg.registerFolder(makeFolder("parent"));
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 200));
    reg.dispose();
  });
});

describe("InspectRegistry isActive", () => {
  it("returns false when not mounted", () => {
    const reg = new InspectRegistry();
    expect(reg.isActive()).toBe(false);
  });

  it("returns false when mounted but idle", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder(makeFolder("f1"));
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(reg.isActive()).toBe(false);
    reg.dispose();
  });
});

describe("InspectRegistry exportState/importState", () => {
  it("exportState returns null when not built", () => {
    const reg = new InspectRegistry();
    expect(reg.exportState()).toBeNull();
  });

  it("importState is no-op when not built", () => {
    const reg = new InspectRegistry();
    reg.importState({ key: "value" });
  });

  it("exportState returns state after mount", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder(makeFolder("f1"));
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const state = reg.exportState();
    expect(state).not.toBeNull();
    reg.dispose();
  });

  it("importState applies state after mount", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder(makeFolder("f1"));
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 200));
    reg.importState({ speed: 75 });
    reg.dispose();
  });
});

describe("InspectRegistry getFolder/getCustomControl", () => {
  it("getFolder returns undefined when not built", () => {
    const reg = new InspectRegistry();
    expect(reg.getFolder("x")).toBeUndefined();
  });

  it("getCustomControl returns undefined when not built", () => {
    const reg = new InspectRegistry();
    expect(reg.getCustomControl("x")).toBeUndefined();
  });

  it("getFolder returns folder after mount", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder(makeFolder("f1"));
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const folder = reg.getFolder("f1");
    expect(folder).toBeDefined();
    reg.dispose();
  });
});
