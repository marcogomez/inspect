// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { GuiFolder } from "../../src/gui/gui-folder";
import { makeFakeInspectTheme } from "../test-helpers";

describe("GuiFolder title getter", () => {
  it("returns the title string", () => {
    const f = new GuiFolder();
    f.title = "My Folder";
    expect(f.title).toBe("My Folder");
  });
});

describe("GuiFolder rebuild skip", () => {
  it("rebuild is no-op when folder not expanded", () => {
    const f = new GuiFolder();
    f.title = "Test";
    f.applyTheme(makeFakeInspectTheme());
    f.expanded = false;
    f.width = 300;
    f.height = 200;
    f.needsLayout = true;
    f.computeLayout();
  });
});
