import { describe, expect, it, vi } from "vitest";

import {
  button,
  buttonRow,
  color,
  customControl,
  matrixGrid,
  monitor,
  point2d,
  point3d,
  reorderList,
  select,
  separator,
  slider,
  subfolder,
  text,
  textLog,
  toggle
} from "../src/types";

describe("shared factory functions", () => {
  it("slider() creates slider control config", () => {
    const c = slider({
      key: "x",
      min: 0,
      max: 1,
      step: 0.1,
      value: () => 0.5,
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("slider");
  });

  it("toggle() creates toggle control config", () => {
    const c = toggle({
      key: "x",
      value: () => true,
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("toggle");
  });

  it("select() creates select control config", () => {
    const c = select({
      key: "x",
      options: { A: "a" },
      value: () => "a",
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("select");
  });

  it("button() creates button control config", () => {
    const c = button({
      key: "x",
      title: "Click",
      onClick: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("button");
  });

  it("monitor() creates monitor control config", () => {
    const c = monitor({ key: "x", value: () => 42 });
    expect(c.type).toBe("monitor");
  });

  it("color() creates color control config", () => {
    const c = color({
      key: "x",
      value: () => ({ r: 1, g: 0, b: 0 }),
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("color");
  });

  it("text() creates text control config", () => {
    const c = text({
      key: "x",
      value: () => "hi",
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("text");
  });

  it("point2d() creates point2d control config", () => {
    const c = point2d({
      key: "x",
      value: () => ({ x: 0, y: 0 }),
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("point2d");
  });

  it("point3d() creates point3d control config", () => {
    const c = point3d({
      key: "x",
      value: () => ({ x: 0, y: 0, z: 0 }),
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("point3d");
  });

  it("separator() creates separator config", () => {
    const c = separator("sep1");
    expect(c.type).toBe("separator");
  });

  it("matrixGrid() creates matrixGrid config", () => {
    const c = matrixGrid({ key: "grid" } as never);
    expect(c.type).toBe("matrixGrid");
  });

  it("buttonRow() creates buttonRow config", () => {
    const c = buttonRow({ key: "row", buttons: [] });
    expect(c.type).toBe("buttonRow");
  });

  it("subfolder() creates subfolder config", () => {
    const c = subfolder({ key: "sub", title: "Sub", controls: [] });
    expect(c.type).toBe("subfolder");
  });

  it("reorderList() creates reorderList config", () => {
    const c = reorderList({
      key: "order",
      items: [],
      onChange: () => {
        /* no-op */
      }
    });
    expect(c.type).toBe("reorderList");
  });

  it("textLog() creates textLog config", () => {
    const c = textLog({ key: "log", getValue: () => "" });
    expect(c.type).toBe("textLog");
  });

  it("customControl() creates custom config", () => {
    const c = customControl("myType", { key: "custom", data: 42 });
    expect(c.type).toBe("myType");
  });
});

describe("namespace .of() helpers", () => {
  it("slider.of() binds to target property", () => {
    const obj = { speed: 5 };
    const c = slider.of(obj, "speed", { min: 0, max: 10 });
    expect(c.type).toBe("slider");
    const cfg = c.config as { value: () => number; onChange: (v: number) => void; label: string };
    expect(cfg.value()).toBe(5);
    cfg.onChange(8);
    expect(obj.speed).toBe(8);
    expect(cfg.label).toBe("speed");
  });

  it("slider.of() with custom label and onChange callback", () => {
    const obj = { val: 1 };
    const cb = vi.fn();
    const c = slider.of(obj, "val", { min: 0, max: 10, label: "Value", step: 0.5 }, cb);
    const cfg = c.config as { onChange: (v: number) => void; label: string };
    cfg.onChange(5);
    expect(cb).toHaveBeenCalled();
    expect(cfg.label).toBe("Value");
  });

  it("toggle.of() binds to target boolean", () => {
    const obj = { enabled: false };
    const c = toggle.of(obj, "enabled");
    const cfg = c.config as { value: () => boolean; onChange: (v: boolean) => void };
    expect(cfg.value()).toBe(false);
    cfg.onChange(true);
    expect(obj.enabled).toBe(true);
  });

  it("toggle.of() with callback", () => {
    const obj = { on: true };
    const cb = vi.fn();
    const c = toggle.of(obj, "on", cb);
    const cfg = c.config as { onChange: (v: boolean) => void };
    cfg.onChange(false);
    expect(cb).toHaveBeenCalled();
  });

  it("toggle.of() with opts object", () => {
    const obj = { on: true };
    const c = toggle.of(obj, "on", { label: "Power" });
    const cfg = c.config as { label: string };
    expect(cfg.label).toBe("Power");
  });

  it("select.of() binds to target", () => {
    const obj = { mode: "fast" as string | number };
    const c = select.of(obj, "mode", { options: { Fast: "fast", Slow: "slow" } });
    const cfg = c.config as { value: () => string | number; onChange: (v: string | number) => void };
    expect(cfg.value()).toBe("fast");
    cfg.onChange("slow");
    expect(obj.mode).toBe("slow");
  });

  it("color.of() binds to target", () => {
    const obj = { skyColor: "#ff0000" as string | { r: number; g: number; b: number } };
    const c = color.of(obj, "skyColor");
    const cfg = c.config as { value: () => unknown; onChange: (v: unknown) => void };
    expect(cfg.value()).toBe("#ff0000");
    cfg.onChange("#00ff00");
    expect(obj.skyColor).toBe("#00ff00");
  });

  it("color.of() with callback", () => {
    const obj = { c: "#000" as string | { r: number; g: number; b: number } };
    const cb = vi.fn();
    const c = color.of(obj, "c", cb);
    const cfg = c.config as { onChange: (v: unknown) => void };
    cfg.onChange("#fff");
    expect(cb).toHaveBeenCalled();
  });

  it("color.of() with opts", () => {
    const obj = { c: "#000" as string | { r: number; g: number; b: number } };
    const c = color.of(obj, "c", { colorType: "int", alpha: true, displayFormat: "intRgba" });
    const cfg = c.config as { colorType: string; alpha: boolean; displayFormat: string };
    expect(cfg.colorType).toBe("int");
    expect(cfg.alpha).toBe(true);
    expect(cfg.displayFormat).toBe("intRgba");
  });

  it("text.of() binds to target string", () => {
    const obj = { name: "hello" };
    const c = text.of(obj, "name");
    const cfg = c.config as { value: () => string; onChange: (v: string) => void };
    expect(cfg.value()).toBe("hello");
    cfg.onChange("world");
    expect(obj.name).toBe("world");
  });

  it("text.of() with callback", () => {
    const obj = { name: "hi" };
    const cb = vi.fn();
    const c = text.of(obj, "name", cb);
    const cfg = c.config as { onChange: (v: string) => void };
    cfg.onChange("bye");
    expect(cb).toHaveBeenCalled();
  });

  it("point2d.of() binds to target", () => {
    const obj = { pos: { x: 1, y: 2 } };
    const c = point2d.of(obj, "pos");
    const cfg = c.config as { value: () => { x: number; y: number }; onChange: (v: { x: number; y: number }) => void };
    expect(cfg.value()).toEqual({ x: 1, y: 2 });
    cfg.onChange({ x: 3, y: 4 });
    expect(obj.pos).toEqual({ x: 3, y: 4 });
  });

  it("point2d.of() with callback", () => {
    const obj = { pos: { x: 0, y: 0 } };
    const cb = vi.fn();
    const c = point2d.of(obj, "pos", cb);
    const cfg = c.config as { onChange: (v: { x: number; y: number }) => void };
    cfg.onChange({ x: 1, y: 1 });
    expect(cb).toHaveBeenCalled();
  });

  it("point2d.of() with axis opts", () => {
    const obj = { pos: { x: 0, y: 0 } };
    const c = point2d.of(obj, "pos", { x: { min: -10, max: 10 }, y: { min: 0, max: 100 } });
    expect(c.type).toBe("point2d");
  });

  it("point3d.of() binds to target", () => {
    const obj = { pos: { x: 1, y: 2, z: 3 } };
    const c = point3d.of(obj, "pos");
    const cfg = c.config as {
      value: () => { x: number; y: number; z: number };
      onChange: (v: { x: number; y: number; z: number }) => void;
    };
    expect(cfg.value()).toEqual({ x: 1, y: 2, z: 3 });
    cfg.onChange({ x: 4, y: 5, z: 6 });
    expect(obj.pos).toEqual({ x: 4, y: 5, z: 6 });
  });

  it("point3d.of() with callback", () => {
    const obj = { pos: { x: 0, y: 0, z: 0 } };
    const cb = vi.fn();
    const c = point3d.of(obj, "pos", cb);
    const cfg = c.config as { onChange: (v: { x: number; y: number; z: number }) => void };
    cfg.onChange({ x: 1, y: 1, z: 1 });
    expect(cb).toHaveBeenCalled();
  });
});
