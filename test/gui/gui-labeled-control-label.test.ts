// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { LabeledControl } from "../../src/gui/labeled-control";

describe("LabeledControl labelText getter", () => {
  it("returns the label text", () => {
    const lc = new LabeledControl();
    lc.labelText = "Speed";
    expect(lc.labelText).toBe("Speed");
  });
});
