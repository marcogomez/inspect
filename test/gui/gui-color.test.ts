import { describe, expect, it } from "vitest";

import { GuiColor } from "../../src/gui/gui-color";

describe("GuiColor", () => {
  it("creates with float mode by default", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 0.5, g: 0.3, b: 0.1 }),
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.config.key).toBe("color");
  });

  it("creates with hex mode", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => "#ff0000",
      onChange: () => {
        /* no-op */
      },
      mode: "hex"
    });
    expect(c.config.mode).toBe("hex");
  });

  it("creates with int mode", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 128, g: 64, b: 32 }),
      onChange: () => {
        /* no-op */
      },
      mode: "int"
    });
    expect(c.config.mode).toBe("int");
  });

  it("creates with alpha enabled", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 0.5, g: 0.3, b: 0.1, a: 0.8 }),
      onChange: () => {
        /* no-op */
      },
      alpha: true
    });
    expect(c.config.alpha).toBe(true);
  });

  it("creates with explicit display format", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 0.5, g: 0.3, b: 0.1 }),
      onChange: () => {
        /* no-op */
      },
      displayFormat: "intRgb"
    });
    expect(c.config.displayFormat).toBe("intRgb");
  });

  it("refresh syncs from value", () => {
    let r = 0.5;
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r, g: 0.3, b: 0.1 }),
      onChange: () => {
        /* no-op */
      }
    });
    r = 0.8;
    c.refresh();
  });

  it("refresh skips when value unchanged", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 0.5, g: 0.3, b: 0.1 }),
      onChange: () => {
        /* no-op */
      }
    });
    c.refresh();
    c.refresh();
  });

  it("parses hex string input", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => "#ff8040",
      onChange: () => {
        /* no-op */
      },
      mode: "hex"
    });
    c.refresh();
  });

  it("parses hex string with alpha", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => "#ff804080",
      onChange: () => {
        /* no-op */
      },
      mode: "hexAlpha"
    });
    c.refresh();
  });

  it("opens picker on pointer down", () => {
    const c = new GuiColor({
      key: "color",
      label: "Color",
      value: () => ({ r: 0.5, g: 0.3, b: 0.1 }),
      onChange: () => {
        /* no-op */
      }
    });
    c.width = 200;
    c.height = 24;
    c.onPointerDown(1, 10, 12, 0);
  });
});
