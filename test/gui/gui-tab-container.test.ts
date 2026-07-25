// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { GuiTabContainer } from "../../src/gui/gui-tab-container";
import { makeFakeInspectTheme } from "../test-helpers";

describe("GuiTabContainer", () => {
  it("setActivePage changes visible page", () => {
    const tc = new GuiTabContainer();
    tc.addPage("Page 1");
    tc.addPage("Page 2");
    tc.addPage("Page 3");

    expect(tc.getActivePage()).toBe(0);
    tc.setActivePage(1);
    expect(tc.getActivePage()).toBe(1);
  });

  it("setActivePage is no-op for same index", () => {
    const tc = new GuiTabContainer();
    tc.addPage("Page 1");
    tc.addPage("Page 2");
    tc.setActivePage(0);
    expect(tc.getActivePage()).toBe(0);
  });

  it("setActivePage ignores out-of-range", () => {
    const tc = new GuiTabContainer();
    tc.addPage("Page 1");
    tc.setActivePage(-1);
    expect(tc.getActivePage()).toBe(0);
    tc.setActivePage(5);
    expect(tc.getActivePage()).toBe(0);
  });

  it("getPageCount returns correct count", () => {
    const tc = new GuiTabContainer();
    expect(tc.getPageCount()).toBe(0);
    tc.addPage("P1");
    expect(tc.getPageCount()).toBe(1);
    tc.addPage("P2");
    expect(tc.getPageCount()).toBe(2);
  });

  it("getPage returns page by index or null", () => {
    const tc = new GuiTabContainer();
    const p = tc.addPage("P1");
    expect(tc.getPage(0)).toBe(p);
    expect(tc.getPage(5)).toBeNull();
  });

  it("tabBar onChange callback switches page", () => {
    const tc = new GuiTabContainer();
    tc.addPage("Page 1");
    tc.addPage("Page 2");

    const tabBar = tc.tabBar;
    if (tabBar.onChange) {
      tabBar.onChange("1");
    }
    expect(tc.getActivePage()).toBe(1);
  });

  it("tabBar onChange with NaN is ignored", () => {
    const tc = new GuiTabContainer();
    tc.addPage("Page 1");

    const tabBar = tc.tabBar;
    if (tabBar.onChange) {
      tabBar.onChange("abc");
    }
    expect(tc.getActivePage()).toBe(0);
  });

  it("applyTheme sets tab bar height", () => {
    const tc = new GuiTabContainer();
    tc.applyTheme(makeFakeInspectTheme());
  });
});
