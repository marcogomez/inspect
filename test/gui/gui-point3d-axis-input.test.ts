// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { GuiPoint3d } from "../../src/gui/gui-point3d";
import { TextInput } from "../../src/widgets/text-input";
import { makeFakeInspectTheme } from "../test-helpers";

/** returns the TextInput backing the given axis of a GuiPoint3d (0 = x, 1 = y, 2 = z). */
function getAxisInput(p: GuiPoint3d, axisIndex: number): TextInput {
  const container = p.children[1].children[axisIndex];
  return container.children[1] as unknown as TextInput;
}

describe("GuiPoint3d handleChange and clampAxis", () => {
  it("onChange fires with clamped x value", () => {
    const onChange = vi.fn();
    const p = new GuiPoint3d({
      key: "pos",
      label: "Pos",
      value: () => ({ x: 5, y: 10, z: 15 }),
      onChange,
      x: { min: 0, max: 50 }
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const xInput = getAxisInput(p, 0);
    const handler = xInput.onChange;
    if (!handler) {
      throw new Error("expected axis input to have an onChange handler");
    }
    handler("25");
    expect(onChange).toHaveBeenCalledWith({ x: 25, y: 10, z: 15 });
  });

  it("onChange fires with clamped y value", () => {
    const onChange = vi.fn();
    const p = new GuiPoint3d({
      key: "pos",
      label: "Pos",
      value: () => ({ x: 5, y: 10, z: 15 }),
      onChange,
      y: { min: -10, max: 100 }
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const yInput = getAxisInput(p, 1);
    const handler = yInput.onChange;
    if (!handler) {
      throw new Error("expected axis input to have an onChange handler");
    }
    handler("50");
    expect(onChange).toHaveBeenCalledWith({ x: 5, y: 50, z: 15 });
  });

  it("onChange fires with clamped z value", () => {
    const onChange = vi.fn();
    const p = new GuiPoint3d({
      key: "pos",
      label: "Pos",
      value: () => ({ x: 5, y: 10, z: 15 }),
      onChange,
      z: { min: 0, max: 20 }
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const zInput = getAxisInput(p, 2);
    const handler = zInput.onChange;
    if (!handler) {
      throw new Error("expected axis input to have an onChange handler");
    }
    handler("18");
    expect(onChange).toHaveBeenCalledWith({ x: 5, y: 10, z: 18 });
  });

  it("NaN input does not fire onChange", () => {
    const onChange = vi.fn();
    const p = new GuiPoint3d({
      key: "pos",
      label: "Pos",
      value: () => ({ x: 5, y: 10, z: 15 }),
      onChange
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const xInput = getAxisInput(p, 0);
    const handler = xInput.onChange;
    if (!handler) {
      throw new Error("expected axis input to have an onChange handler");
    }
    handler("abc");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clampAxis returns unclamped when no axisConfig", () => {
    const onChange = vi.fn();
    const p = new GuiPoint3d({
      key: "pos",
      label: "Pos",
      value: () => ({ x: 0, y: 0, z: 0 }),
      onChange
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const xInput = getAxisInput(p, 0);
    const handler = xInput.onChange;
    if (!handler) {
      throw new Error("expected axis input to have an onChange handler");
    }
    handler("999");
    expect(onChange).toHaveBeenCalledWith({ x: 999, y: 0, z: 0 });
  });

  it("clampAxis clamps min only", () => {
    const onChange = vi.fn();
    const p = new GuiPoint3d({
      key: "pos",
      label: "Pos",
      value: () => ({ x: 0, y: 0, z: 0 }),
      onChange,
      x: { min: 5 }
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const xInput = getAxisInput(p, 0);
    const handler = xInput.onChange;
    if (!handler) {
      throw new Error("expected axis input to have an onChange handler");
    }
    handler("2");
    expect(onChange).toHaveBeenCalledWith({ x: 5, y: 0, z: 0 });
  });

  it("clampAxis clamps max only", () => {
    const onChange = vi.fn();
    const p = new GuiPoint3d({
      key: "pos",
      label: "Pos",
      value: () => ({ x: 0, y: 0, z: 0 }),
      onChange,
      x: { max: 50 }
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const xInput = getAxisInput(p, 0);
    const handler = xInput.onChange;
    if (!handler) {
      throw new Error("expected axis input to have an onChange handler");
    }
    handler("80");
    expect(onChange).toHaveBeenCalledWith({ x: 50, y: 0, z: 0 });
  });
});
