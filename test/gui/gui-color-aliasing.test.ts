// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { GuiColor } from "../../src/gui/gui-color";
import { color } from "../../src/types";
import { Box } from "../../src/widgets/box";
import { makeFakeInspectTheme } from "../test-helpers";

import type { ColorConfig } from "../../src/types";

/**
 * narrows the ControlConfig union returned by color.of to the color variant and
 * returns its ColorConfig (the binding sink under test).
 */
function colorConfig(ctrl: ReturnType<typeof color.of>): ColorConfig {
  if (ctrl.type !== "color") {
    throw new Error("expected a color control config");
  }
  return ctrl.config;
}

/**
 * two float color controls bound to two separate objects must stay independent.
 * the canvas color control emits a single reused scratch object on every edit,
 * so if the binding stored that object by reference both controls would end up
 * pointing at the one scratch object and show each other's color. color.of
 * guards against this by copying the emitted values into the existing bound
 * object instead of keeping the reference; these tests lock that in.
 */

interface ColorState {
  color: { r: number; g: number; b: number };
}

// this invariant lives on the binding itself, independent of any renderer: even
// when a renderer emits one reused object per change (as the canvas control
// does), the binding must not let two controls end up aliasing it.
describe("color.of binding does not alias a reused emit object", () => {
  it("keeps two bound objects independent when fed the same emit object twice", () => {
    const stateA: ColorState = { color: { r: 0, g: 0, b: 0 } };
    const stateB: ColorState = { color: { r: 0, g: 0, b: 0 } };

    const cfgA = colorConfig(color.of(stateA, "color", { colorType: "float" }));
    const cfgB = colorConfig(color.of(stateB, "color", { colorType: "float" }));

    // simulate a renderer reusing a single scratch object across emits
    const scratch = { r: 0, g: 0, b: 0 };
    scratch.r = 0.1;
    scratch.g = 0.2;
    scratch.b = 0.3;
    cfgA.onChange(scratch); // edit control A

    scratch.r = 0.9;
    scratch.g = 0.8;
    scratch.b = 0.7;
    cfgB.onChange(scratch); // edit control B with the same object, new values

    // they must not share identity, and A must keep its own value
    expect(stateA.color).not.toBe(stateB.color);
    expect(stateA.color.r).toBeCloseTo(0.1, 5);
    expect(stateB.color.r).toBeCloseTo(0.9, 5);
  });
});

/** mounts a canvas-backed surface with a vertical stack root for the full integration test. */
function mountSurface() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 600;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeInspectTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 400;
  root.height = 600;
  root.layout = new StackLayout("vertical", 0, "start", "stretch");
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 600;
  return { surface, root, theme };
}

/** builds a GuiColor bound to state.color via color.of, adds it to root, and returns the control. */
function addColor(root: Box, theme: ReturnType<typeof makeFakeInspectTheme>, state: ColorState): GuiColor {
  // GuiColor requires a label, but the shared ColorConfig makes it optional; fall
  // back to the key, and carry over the binding's value and onChange unchanged.
  const cfg = colorConfig(color.of(state, "color", { colorType: "float" }));
  const c = new GuiColor({
    key: cfg.key,
    label: cfg.label ?? cfg.key,
    value: cfg.value,
    onChange: cfg.onChange
  });
  c.applyTheme(theme);
  root.addChild(c);
  return c;
}

describe("GuiColor — two float pickers stay independent (canvas)", () => {
  it("editing one control does not alias or corrupt another", () => {
    const { surface, root, theme } = mountSurface();

    const stateA: ColorState = { color: { r: 0.1, g: 0.2, b: 0.3 } };
    const stateB: ColorState = { color: { r: 0.7, g: 0.8, b: 0.9 } };

    const a = addColor(root, theme, stateA);
    const b = addColor(root, theme, stateB);
    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    // edit A (drag in the SV area), this emits A's color
    (a as unknown as { updateSV: (x: number, y: number, w: number, h: number) => void }).updateSV(40, 20, 100, 100);
    const aAfterEdit = { ...stateA.color };

    // edit B to a clearly different color (drag the hue bar)
    (b as unknown as { updateHue: (x: number, w: number) => void }).updateHue(150, 200);

    // the two bound objects must remain distinct references...
    expect(stateA.color).not.toBe(stateB.color);
    // ...and editing B must not have mutated A's stored value
    expect(stateA.color).toEqual(aAfterEdit);

    surface.dispose();
  });
});
