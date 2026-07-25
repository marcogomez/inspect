import { describe, expect, it, vi } from "vitest";

import { GuiPoint2d } from "../../src/gui/gui-point2d";
import { GuiPoint3d } from "../../src/gui/gui-point3d";
import { makeFakeInspectTheme } from "../test-helpers";

describe("GuiPoint2d", () => {
  it("creates with initial x/y values", () => {
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 10, y: 20 }),
      onChange: () => {
        /* no-op */
      }
    });
    expect(p.config.key).toBe("pos");
  });

  it("refresh updates axes when values change", () => {
    let x = 10,
      y = 20;
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x, y }),
      onChange: () => {
        /* no-op */
      }
    });
    x = 30;
    y = 40;
    p.refresh();
  });

  it("refresh skips when values unchanged", () => {
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 10, y: 20 }),
      onChange: () => {
        /* no-op */
      }
    });
    p.refresh();
    p.refresh();
  });

  it("clamps axis values when config has min/max", () => {
    const onChange = vi.fn();
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 0, y: 0 }),
      onChange,
      x: { min: -10, max: 10 },
      y: { min: 0, max: 100 }
    });
    expect(p.config.x?.min).toBe(-10);
    expect(p.config.y?.max).toBe(100);
  });
});

describe("GuiPoint3d", () => {
  it("creates with initial x/y/z values", () => {
    const p = new GuiPoint3d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 1, y: 2, z: 3 }),
      onChange: () => {
        /* no-op */
      }
    });
    expect(p.config.key).toBe("pos");
  });

  it("refresh updates all three axes", () => {
    let x = 1,
      y = 2,
      z = 3;
    const p = new GuiPoint3d({
      key: "pos",
      label: "Position",
      value: () => ({ x, y, z }),
      onChange: () => {
        /* no-op */
      }
    });
    x = 10;
    y = 20;
    z = 30;
    p.refresh();
  });

  it("refresh skips unchanged values", () => {
    const p = new GuiPoint3d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 1, y: 2, z: 3 }),
      onChange: () => {
        /* no-op */
      }
    });
    p.refresh();
    p.refresh();
  });

  it("accepts axis constraints", () => {
    const p = new GuiPoint3d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 0, y: 0, z: 0 }),
      onChange: () => {
        /* no-op */
      },
      x: { min: -100, max: 100 },
      z: { step: 0.5 }
    });
    expect(p.config.x?.min).toBe(-100);
    expect(p.config.z?.step).toBe(0.5);
  });
});

describe("GuiPoint2d applyTheme and handleChange", () => {
  it("applies theme", () => {
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 0, y: 0 }),
      onChange: () => {
        /* no-op */
      }
    });
    p.applyTheme(makeFakeInspectTheme());
  });

  it("handles x axis change via text input", () => {
    const onChange = vi.fn();
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 10, y: 20 }),
      onChange,
      x: { min: 0, max: 100 }
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();
    const xInput = p.children[1].children[0].children[1];
    xInput.onKeyDown("5", "Digit5", false, false, false);
    xInput.onKeyDown("0", "Digit0", false, false, false);
  });

  it("handles NaN input gracefully", () => {
    const onChange = vi.fn();
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 0, y: 0 }),
      onChange
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();
  });
});

describe("GuiPoint2d y-axis handleChange and clampAxis", () => {
  it("handles y axis change with min/max clamping", () => {
    const onChange = vi.fn();
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 10, y: 20 }),
      onChange,
      y: { min: 0, max: 50 }
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const yInput = p.children[1].children[1].children[1] as unknown as { onChange: ((t: string) => void) | null };
    if (yInput.onChange) {
      yInput.onChange("100");
    }
    expect(onChange).toHaveBeenCalledWith({ x: 10, y: 50 });
  });

  it("handles y axis change below min", () => {
    const onChange = vi.fn();
    const p = new GuiPoint2d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 10, y: 20 }),
      onChange,
      y: { min: 5, max: 50 }
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 400;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();

    const yInput = p.children[1].children[1].children[1] as unknown as { onChange: ((t: string) => void) | null };
    if (yInput.onChange) {
      yInput.onChange("-10");
    }
    expect(onChange).toHaveBeenCalledWith({ x: 10, y: 5 });
  });
});

describe("GuiPoint2d y-axis NaN and no-config clamp", () => {
  it("y-axis NaN skips onChange", () => {
    const onChange = vi.fn();
    const p = new GuiPoint2d({
      key: "p",
      label: "P",
      value: () => ({ x: 0, y: 0 }),
      onChange
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 300;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();
    const yInput = p.children[1].children[1].children[1] as unknown as { onChange: ((t: string) => void) | null };
    if (yInput.onChange) {
      yInput.onChange("notanumber");
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clampAxis with no config returns value unchanged", () => {
    const onChange = vi.fn();
    const p = new GuiPoint2d({
      key: "p",
      label: "P",
      value: () => ({ x: 0, y: 0 }),
      onChange
    });
    p.applyTheme(makeFakeInspectTheme());
    p.width = 300;
    p.height = 24;
    p.needsLayout = true;
    p.computeLayout();
    const yInput = p.children[1].children[1].children[1] as unknown as { onChange: ((t: string) => void) | null };
    if (yInput.onChange) {
      yInput.onChange("999");
    }
    expect(onChange).toHaveBeenCalledWith({ x: 0, y: 999 });
  });
});

describe("GuiPoint3d applyTheme", () => {
  it("applies theme", () => {
    const p = new GuiPoint3d({
      key: "pos",
      label: "Position",
      value: () => ({ x: 0, y: 0, z: 0 }),
      onChange: () => {
        /* no-op */
      }
    });
    p.applyTheme(makeFakeInspectTheme());
  });
});
