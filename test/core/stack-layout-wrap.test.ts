// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Widget } from "../../src/core/widget";

describe("StackLayout measureWidth for vertical (cross-axis max)", () => {
  it("returns max child intrinsicWidth for vertical layout", () => {
    const layout = new StackLayout("vertical", 4, "start", "stretch");
    const container = new Widget();
    container.layout = layout;
    const a = new Widget();
    a.preferredWidth = 100;
    a.preferredHeight = 20;
    container.addChild(a);
    const b = new Widget();
    b.preferredWidth = 150;
    b.preferredHeight = 20;
    container.addChild(b);
    const w = layout.measureWidth(container);
    expect(w).toBe(150);
  });

  it("skips invisible children in measureWidth", () => {
    const layout = new StackLayout("vertical", 4, "start", "stretch");
    const container = new Widget();
    container.layout = layout;
    const a = new Widget();
    a.preferredWidth = 100;
    a.preferredHeight = 20;
    container.addChild(a);
    const b = new Widget();
    b.preferredWidth = 200;
    b.preferredHeight = 20;
    b.visible = false;
    container.addChild(b);
    const w = layout.measureWidth(container);
    expect(w).toBe(100);
  });
});

describe("StackLayout measureHeight for horizontal (cross-axis max)", () => {
  it("returns max child intrinsicHeight for horizontal layout", () => {
    const layout = new StackLayout("horizontal", 4, "start", "stretch");
    const container = new Widget();
    container.layout = layout;
    const a = new Widget();
    a.preferredWidth = 50;
    a.preferredHeight = 30;
    container.addChild(a);
    const b = new Widget();
    b.preferredWidth = 50;
    b.preferredHeight = 60;
    container.addChild(b);
    const h = layout.measureHeight(container);
    expect(h).toBe(60);
  });

  it("skips invisible children in measureHeight", () => {
    const layout = new StackLayout("horizontal", 4, "start", "stretch");
    const container = new Widget();
    container.layout = layout;
    const a = new Widget();
    a.preferredWidth = 50;
    a.preferredHeight = 30;
    container.addChild(a);
    const b = new Widget();
    b.preferredWidth = 50;
    b.preferredHeight = 100;
    b.visible = false;
    container.addChild(b);
    const h = layout.measureHeight(container);
    expect(h).toBe(30);
  });
});

describe("StackLayout percent sizing", () => {
  it("allocates percent-based children proportionally", () => {
    const layout = new StackLayout("horizontal", 0, "start", "stretch");
    const container = new Widget();
    container.layout = layout;
    container.width = 200;
    container.height = 100;

    const a = new Widget();
    a.sizingX = "percent";
    a.percentWidth = 0.5;
    container.addChild(a);

    const b = new Widget();
    b.sizingX = "percent";
    b.percentWidth = 0.3;
    container.addChild(b);

    container.needsLayout = true;
    container.computeLayout();

    expect(a.width).toBeCloseTo(100, 0);
    expect(b.width).toBeCloseTo(60, 0);
  });
});

describe("StackLayout cross-axis end alignment", () => {
  it("positions child at end of cross axis", () => {
    const layout = new StackLayout("horizontal", 0, "start", "stretch");
    const container = new Widget();
    container.layout = layout;
    container.width = 200;
    container.height = 100;

    const a = new Widget();
    a.sizingX = "fixed";
    a.preferredWidth = 50;
    a.sizingY = "fixed";
    a.preferredHeight = 30;
    a.alignSelf = "end";
    container.addChild(a);

    container.needsLayout = true;
    container.computeLayout();

    expect(a.height).toBe(30);
  });
});

describe("StackLayout flexGrow with fit sizing", () => {
  it("gives remaining space to flexGrow fit children", () => {
    const layout = new StackLayout("horizontal", 0, "start", "stretch");
    const container = new Widget();
    container.layout = layout;
    container.width = 300;
    container.height = 50;

    const fixed = new Widget();
    fixed.sizingX = "fixed";
    fixed.preferredWidth = 100;
    container.addChild(fixed);

    const growing = new Widget();
    growing.sizingX = "fit";
    growing.flexGrow = 1;
    growing.preferredWidth = 50;
    container.addChild(growing);

    container.needsLayout = true;
    container.computeLayout();

    expect(growing.width).toBeGreaterThan(50);
  });
});
