// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Widget } from "../../src/core/widget";
import { InspectPanel } from "../../src/panel/inspect-panel";

describe("InspectPanel", () => {
  it("creates a canvas element and appends to container", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});
    expect(container.querySelector("canvas")).not.toBeNull();
    expect(panel.canvas).toBeInstanceOf(HTMLCanvasElement);
    panel.dispose();
  });

  it("starts with correct default visibility (hidden by default)", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});
    expect(panel.visible).toBe(false);
    panel.dispose();
  });

  it("respects initiallyVisible option", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { initiallyVisible: true });
    expect(panel.visible).toBe(true);
    panel.dispose();
  });

  it("toggle switches visibility", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});
    expect(panel.visible).toBe(false);
    panel.toggle();
    expect(panel.visible).toBe(true);
    panel.toggle();
    expect(panel.visible).toBe(false);
    panel.dispose();
  });

  it("show makes panel visible", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});
    panel.show();
    expect(panel.visible).toBe(true);
    panel.dispose();
  });

  it("show does nothing when already visible", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { initiallyVisible: true });
    panel.show();
    expect(panel.visible).toBe(true);
    panel.dispose();
  });

  it("hide makes panel invisible", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { initiallyVisible: true });
    panel.hide();
    expect(panel.visible).toBe(false);
    panel.dispose();
  });

  it("hide does nothing when already hidden", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});
    panel.hide();
    expect(panel.visible).toBe(false);
    panel.dispose();
  });

  it("isVisible returns current state", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});
    expect(panel.isVisible()).toBe(false);
    panel.show();
    expect(panel.isVisible()).toBe(true);
    panel.dispose();
  });

  it("setContent replaces root children", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});
    const widget = new Widget();
    panel.setContent(widget);
    expect(panel.root.children).toContain(widget);
    panel.dispose();
  });

  it("positions on the right by default", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { position: "right" });
    expect(panel.canvas.style.right).toBeDefined();
    panel.dispose();
  });

  it("positions on the left when specified", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { position: "left" });
    expect(panel.canvas.style.left).toBeDefined();
    panel.dispose();
  });

  it("applies border radius when specified", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { borderRadius: 8 });
    expect(panel.canvas.style.borderRadius).toBe("8px");
    panel.dispose();
  });

  it("dispose removes canvas from DOM", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});
    expect(container.querySelector("canvas")).not.toBeNull();
    panel.dispose();
    expect(container.querySelector("canvas")).toBeNull();
  });
});
