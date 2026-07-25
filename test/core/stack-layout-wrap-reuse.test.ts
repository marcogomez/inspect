// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it } from "vitest";

import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Widget } from "../../src/core/widget";

describe("StackLayout wrap line array reuse on recompute", () => {
  it("reuses lineSizes array on second compute without reallocating", () => {
    const layout = new StackLayout("horizontal", 4, "start", "stretch", true);
    const container = new Widget();
    container.layout = layout;
    container.width = 100;
    container.height = 200;

    for (let i = 0; i < 5; i++) {
      const child = new Widget();
      child.sizingX = "fixed";
      child.preferredWidth = 40;
      child.preferredHeight = 20;
      container.addChild(child);
    }

    container.needsLayout = true;
    container.computeLayout();
    container.needsLayout = true;
    container.computeLayout();
  });
});
