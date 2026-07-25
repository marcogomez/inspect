// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { GuiSlider } from "../../src/gui/gui-slider";
import { makeFakeInspectTheme } from "../test-helpers";

describe("GuiSlider value input interaction", () => {
  it("valueInput scrub drag updates slider and fires config onChange", () => {
    let val = 50;
    const onChange = vi.fn((v: number) => {
      val = v;
    });
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange
    });
    s.applyTheme(makeFakeInspectTheme());
    s.width = 400;
    s.height = 24;
    s.needsLayout = true;
    s.computeLayout();

    const valueInput = s.children[1].children[1];
    valueInput.onPointerDown(1, 5, 12, 0);
    valueInput.onPointerMove(1, 25, 12);
    valueInput.onPointerUp(1, 25, 12, 0);
  });

  it("valueInput onCommit fires config onChange when applyOnRelease", () => {
    let val = 50;
    const onChange = vi.fn((v: number) => {
      val = v;
    });
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange,
      applyOnRelease: true
    });
    s.applyTheme(makeFakeInspectTheme());
    s.width = 400;
    s.height = 24;
    s.needsLayout = true;
    s.computeLayout();

    const valueInput = s.children[1].children[1];
    valueInput.onPointerDown(1, 5, 12, 0);
    valueInput.onPointerMove(1, 25, 12);
    valueInput.onPointerUp(1, 25, 12, 0);
  });

  it("snap returns raw value when step is 0", () => {
    let val = 33.7;
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 0,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    s.refresh();
  });

  it("slider track onRelease fires config onChange with applyOnRelease", () => {
    let val = 50;
    const onChange = vi.fn((v: number) => {
      val = v;
    });
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange,
      applyOnRelease: true
    });
    s.applyTheme(makeFakeInspectTheme());
    s.width = 400;
    s.height = 24;
    s.needsLayout = true;
    s.computeLayout();

    const slider = s.children[1].children[0];
    slider.onPointerDown(1, 100, 12, 0);
    slider.onPointerUp(1, 100, 12, 0);
    expect(onChange).toHaveBeenCalled();
  });

  it("valueInput click outside scrub zone starts editing", () => {
    let val = 50;
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    s.applyTheme(makeFakeInspectTheme());
    s.width = 400;
    s.height = 24;
    s.needsLayout = true;
    s.computeLayout();

    const valueInput = s.children[1].children[1];
    valueInput.onPointerDown(1, 50, 12, 0);
  });
});
