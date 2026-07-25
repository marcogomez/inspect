// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { InspectRegistry } from "../src/InspectRegistry";

describe("InspectRegistry isActive with hovered panel", () => {
  it("returns true when panel canvas is hovered", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder({ id: "f1", title: "F1", controls: [] });
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((r) => setTimeout(r, 300));
    const canvas = container.querySelector("canvas");
    if (canvas) {
      canvas.dispatchEvent(new Event("pointerenter"));
    }
    expect(reg.isActive()).toBe(true);
    reg.dispose();
  });
});

describe("InspectRegistry rebuild clears existing builder", () => {
  it("clears previous builder before rebuilding on new folder", async () => {
    const reg = new InspectRegistry();
    reg.registerFolder({ id: "f1", title: "F1", controls: [] });
    const container = document.createElement("div");
    reg.mount(container);
    await new Promise((r) => setTimeout(r, 300));
    reg.registerFolder({ id: "f2", title: "F2", controls: [] });
    await new Promise((r) => setTimeout(r, 100));
    reg.dispose();
  });
});
