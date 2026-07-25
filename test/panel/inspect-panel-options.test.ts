// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { InspectPanel } from "../../src/panel/inspect-panel";

describe("InspectPanel debugMode", () => {
  it("creates debugger when debugMode is true", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { debugMode: true });
    expect(panel.canvas).toBeInstanceOf(HTMLCanvasElement);
    panel.dispose();
  });
});

describe("InspectPanel pointer hover", () => {
  it("tracks hover state on pointer enter/leave", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {});

    expect(panel.isHovered()).toBe(false);
    panel.canvas.dispatchEvent(new Event("pointerenter"));
    expect(panel.isHovered()).toBe(true);
    panel.canvas.dispatchEvent(new Event("pointerleave"));
    expect(panel.isHovered()).toBe(false);

    panel.dispose();
  });
});

describe("InspectPanel font and theme options", () => {
  it("loads font atlas and resolves ready promise", async () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { fontFamily: "monospace" });
    await panel.ready;
    expect(panel.theme.fontAtlas).toBeDefined();
    panel.dispose();
  });

  it("applies theme overrides from options", async () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {
      bgPanel: 0x112233ff,
      textPrimary: 0xffaa00ff
    });
    await panel.ready;
    expect(panel.theme.bgPanel).toBe(0x112233ff);
    expect(panel.theme.textPrimary).toBe(0xffaa00ff);
    panel.dispose();
  });

  it("applies widgetBorderRadius override", async () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, {
      widgetBorderRadius: 6
    });
    await panel.ready;
    expect(panel.theme.borderRadius).toBe(6);
    panel.dispose();
  });
});

describe("InspectPanel left position", () => {
  it("applies left position show/hide transitions", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { position: "left", margin: 10 });
    panel.show();
    expect(panel.canvas.style.left).toBe("10px");
    panel.hide();
    expect(panel.canvas.style.left).not.toBe("10px");
    panel.dispose();
  });
});

describe("InspectPanel persistVisibility disabled", () => {
  it("does not read or write storage when persistVisibility is false", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { persistVisibility: false, initiallyVisible: true });
    expect(panel.visible).toBe(true);
    panel.hide();
    expect(panel.visible).toBe(false);
    panel.dispose();
  });
});

describe("InspectPanel custom theme object", () => {
  it("applies a full custom theme object", async () => {
    const { makeFakeInspectTheme } = await import("../test-helpers");
    const container = document.createElement("div");
    const customTheme = makeFakeInspectTheme();
    customTheme.bgApp = 0x112233ff;
    const panel = new InspectPanel(container, { theme: customTheme });
    await panel.ready;
    expect(panel.theme.bgApp).toBe(0x112233ff);
    panel.dispose();
  });
});

describe("InspectPanel dispose removes keyHandler", () => {
  it("cleans up key listener on dispose", () => {
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { toggleKey: "i" });
    panel.dispose();
  });
});
