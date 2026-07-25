// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { GuiSlider } from "../../src/gui/gui-slider";
import { makeFakeInspectTheme } from "../test-helpers";

describe("GuiSlider applyOnRelease", () => {
  it("fires onChange only on release when applyOnRelease is true", () => {
    const onChange = vi.fn();
    const slider = new GuiSlider({
      key: "vol",
      label: "Volume",
      min: 0,
      max: 100,
      step: 1,
      value: () => 50,
      onChange,
      applyOnRelease: true
    });
    slider.applyTheme(makeFakeInspectTheme());
    slider.width = 300;
    slider.height = 24;
    slider.needsLayout = true;
    slider.computeLayout();

    const sliderWidget = slider.children[1].children[0];
    sliderWidget.onPointerDown(1, 10, 12, 0);
    sliderWidget.onPointerMove(1, 50, 12);
    expect(onChange).not.toHaveBeenCalled();

    sliderWidget.onPointerUp(1, 50, 12, 0);
    expect(onChange).toHaveBeenCalled();
  });

  it("fires onChange immediately when applyOnRelease is false", () => {
    const onChange = vi.fn();
    const slider = new GuiSlider({
      key: "vol",
      label: "Volume",
      min: 0,
      max: 100,
      step: 1,
      value: () => 50,
      onChange,
      applyOnRelease: false
    });
    slider.applyTheme(makeFakeInspectTheme());
    slider.width = 300;
    slider.height = 24;
    slider.needsLayout = true;
    slider.computeLayout();

    const sliderWidget = slider.children[1].children[0];
    sliderWidget.onPointerDown(1, 10, 12, 0);
    sliderWidget.onPointerMove(1, 80, 12);
    expect(onChange).toHaveBeenCalled();
  });
});
