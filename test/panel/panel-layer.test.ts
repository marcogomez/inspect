import { describe, expect, it } from "vitest";

import { DEFAULTS } from "../../src/defaults";
import { createDarkTheme } from "../../src/themes/dark";

import type { FontAtlas } from "../../src/core/atlas";

describe("DEFAULTS", () => {
  it("has all expected styling keys", () => {
    expect(DEFAULTS.valueColumnWidth).toBe(210);
    expect(DEFAULTS.controlInnerGap).toBe(4);
    expect(DEFAULTS.tabBarHeight).toBe(35);
    expect(DEFAULTS.scrollSpeed).toBe(40);
    expect(DEFAULTS.checkboxSize).toBe(24);
    expect(DEFAULTS.colorSvSize).toBe(96);
    expect(DEFAULTS.monitorRingSize).toBe(64);
    expect(DEFAULTS.panelDefaultWidth).toBe(400);
    expect(DEFAULTS.panelDefaultFontSize).toBe(11);
    expect(DEFAULTS.panelDefaultFontFamily).toBe("monospace");
  });

  it("has valid color values (non-zero packed RGBA)", () => {
    expect(DEFAULTS.sliderKnobShadowColor).toBeGreaterThan(0);
    expect(DEFAULTS.sliderDefaultThumbColor).toBeGreaterThan(0);
    expect(DEFAULTS.checkboxDefaultBorderColor).toBeGreaterThan(0);
    expect(DEFAULTS.colorSwatchBorderColor).toBeGreaterThan(0);
    expect(DEFAULTS.reorderIndicatorColor).toBeGreaterThan(0);
    expect(DEFAULTS.separatorDefaultColor).toBeGreaterThan(0);
    expect(DEFAULTS.textInputSelectionColor).toBeGreaterThan(0);
  });

  it("has valid string defaults for panel", () => {
    expect(DEFAULTS.panelZIndex).toBe("999999");
    expect(DEFAULTS.panelTransitionDuration).toBe("0.7s");
    expect(typeof DEFAULTS.panelTransitionEasing).toBe("string");
    expect(typeof DEFAULTS.panelBoxShadowColor).toBe("string");
    expect(typeof DEFAULTS.editInputBg).toBe("string");
    expect(typeof DEFAULTS.editInputColor).toBe("string");
  });
});

describe("createDarkTheme", () => {
  const fakeAtlas = { charWidth: 7, lineHeight: 14 } as FontAtlas;
  const theme = createDarkTheme(fakeAtlas);

  it("returns a complete theme object", () => {
    expect(theme.fontAtlas).toBe(fakeAtlas);
    expect(theme.bgApp).toBeDefined();
    expect(theme.textPrimary).toBeDefined();
  });

  it("has non-zero color values", () => {
    expect(theme.bgApp).toBeGreaterThan(0);
    expect(theme.bgPanel).toBeGreaterThan(0);
    expect(theme.textPrimary).toBeGreaterThan(0);
    expect(theme.textValue).toBeGreaterThan(0);
    expect(theme.bgAccent).toBeGreaterThan(0);
  });

  it("has expected spacing values", () => {
    expect(theme.spacingXS).toBe(1);
    expect(theme.spacingSM).toBe(2);
    expect(theme.spacingMD).toBe(4);
    expect(theme.spacingLG).toBe(8);
  });

  it("has expected control dimensions", () => {
    expect(theme.controlHeight).toBe(24);
    expect(theme.buttonHeight).toBe(24);
    expect(theme.borderRadius).toBe(3);
    expect(theme.panelPadding).toBe(8);
    expect(theme.scrollbarWidth).toBe(5);
  });

  it("has expected folder theme", () => {
    expect(theme.bgFolder).toBeGreaterThan(0);
    expect(theme.bgFolderHover).toBeGreaterThan(0);
    expect(theme.textFolder).toBeGreaterThan(0);
    expect(theme.folderHeaderHeight).toBe(28);
  });
});
