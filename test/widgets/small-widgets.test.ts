// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Widget } from "../../src/core/widget";
import { DEFAULTS } from "../../src/defaults";
import { CanvasWidget } from "../../src/widgets/canvas-widget";
import { Overlay } from "../../src/widgets/overlay";
import { Separator } from "../../src/widgets/separator";
import { ToggleButton } from "../../src/widgets/toggle-button";
import { makeFakeTheme } from "../test-helpers";

describe("Separator", () => {
  it("defaults to horizontal, default color and thickness", () => {
    const s = new Separator();
    expect(s.direction).toBe("horizontal");
    expect(s.color).toBe(DEFAULTS.separatorDefaultColor);
    expect(s.thickness).toBe(DEFAULTS.separatorDefaultThickness);
  });

  it("accepts vertical direction", () => {
    const s = new Separator();
    s.direction = "vertical";
    expect(s.direction).toBe("vertical");
  });

  it("draws horizontal separator", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 20;
    const renderer = new Canvas2DRenderer(canvas);
    const s = new Separator();
    s.width = 200;
    s.height = 20;
    s.direction = "horizontal";
    s.color = 0xff0000ff;
    renderer.begin(200, 20);
    s.draw(renderer, makeFakeTheme());
    renderer.end();
  });

  it("draws vertical separator", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 200;
    const renderer = new Canvas2DRenderer(canvas);
    const s = new Separator();
    s.width = 20;
    s.height = 200;
    s.direction = "vertical";
    s.color = 0xff0000ff;
    renderer.begin(20, 200);
    s.draw(renderer, makeFakeTheme());
    renderer.end();
  });
});

describe("CanvasWidget", () => {
  it("starts with no onDraw", () => {
    const cw = new CanvasWidget();
    expect(cw.onDraw).toBeNull();
  });

  it("onDraw is called during draw if set", () => {
    const cw = new CanvasWidget();
    cw.width = 50;
    cw.height = 50;
    const drawSpy = vi.fn();
    cw.onDraw = drawSpy;

    const fakeRenderer = {
      pushTranslateClip: vi.fn(),
      popTranslateClip: vi.fn(),
      pushClip: vi.fn(),
      popClip: vi.fn(),
      pushTranslate: vi.fn(),
      popTranslate: vi.fn(),
      pushScale: vi.fn(),
      popScale: vi.fn(),
      pushAlpha: vi.fn(),
      popAlpha: vi.fn()
    };
    const fakeTheme = {};
    // drawSelf is protected, call draw which calls drawSelf internally
    cw.draw(fakeRenderer as never, fakeTheme as never);
    expect(drawSpy).toHaveBeenCalledWith(fakeRenderer, fakeTheme, 50, 50);
  });
});

describe("ToggleButton", () => {
  it("starts inactive", () => {
    const tb = new ToggleButton();
    expect(tb.active).toBe(false);
  });

  it("toggles active state on click", () => {
    const tb = new ToggleButton();
    const onClick = tb.onClick;
    if (!onClick) {
      throw new Error("expected toggle button to have an onClick handler");
    }
    expect(tb.active).toBe(false);
    onClick();
    expect(tb.active).toBe(true);
    onClick();
    expect(tb.active).toBe(false);
  });

  it("fires onToggle callback", () => {
    const tb = new ToggleButton();
    const toggleSpy = vi.fn();
    tb.onToggle = toggleSpy;
    const onClick = tb.onClick;
    if (!onClick) {
      throw new Error("expected toggle button to have an onClick handler");
    }
    onClick();
    expect(toggleSpy).toHaveBeenCalledWith(true);
    onClick();
    expect(toggleSpy).toHaveBeenCalledWith(false);
  });

  it("has default active border color from DEFAULTS", () => {
    const tb = new ToggleButton();
    expect(tb.activeBorderColor).toBe(DEFAULTS.toggleActiveBorderColor);
  });

  it("draws in inactive state", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 30;
    const renderer = new Canvas2DRenderer(canvas);
    const tb = new ToggleButton();
    tb.width = 100;
    tb.height = 30;
    renderer.begin(100, 30);
    tb.draw(renderer, makeFakeTheme());
    renderer.end();
  });

  it("draws in active state with border", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 30;
    const renderer = new Canvas2DRenderer(canvas);
    const tb = new ToggleButton();
    tb.width = 100;
    tb.height = 30;
    tb.active = true;
    tb.activeBorderColor = 0xff0000ff;
    renderer.begin(100, 30);
    tb.draw(renderer, makeFakeTheme());
    renderer.end();
  });

  it("draws in active state without border when activeBorderColor is 0", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 30;
    const renderer = new Canvas2DRenderer(canvas);
    const tb = new ToggleButton();
    tb.width = 100;
    tb.height = 30;
    tb.active = true;
    tb.activeBorderColor = 0;
    renderer.begin(100, 30);
    tb.draw(renderer, makeFakeTheme());
    renderer.end();
  });
});

describe("Overlay", () => {
  it("defaults to backdrop color and dismissOnBackdrop true", () => {
    const o = new Overlay();
    expect(o.backdropColor).toBe(DEFAULTS.overlayDefaultBackdropColor);
    expect(o.dismissOnBackdrop).toBe(true);
  });

  it("calls onDismiss when clicking outside children", () => {
    const o = new Overlay();
    o.width = 400;
    o.height = 300;
    const dismissSpy = vi.fn();
    o.onDismiss = dismissSpy;
    const accepted = o.onPointerDown(1, 200, 150, 0);
    expect(accepted).toBe(true);
    expect(dismissSpy).toHaveBeenCalledOnce();
  });

  it("does not dismiss when clicking on a child", () => {
    const o = new Overlay();
    o.width = 400;
    o.height = 300;
    const child = new Widget();
    child.x = 100;
    child.y = 100;
    child.width = 50;
    child.height = 50;
    o.addChild(child);
    const dismissSpy = vi.fn();
    o.onDismiss = dismissSpy;
    const accepted = o.onPointerDown(1, 120, 120, 0);
    expect(accepted).toBe(false);
    expect(dismissSpy).not.toHaveBeenCalled();
  });

  it("does not dismiss when dismissOnBackdrop is false", () => {
    const o = new Overlay();
    o.width = 400;
    o.height = 300;
    o.dismissOnBackdrop = false;
    const dismissSpy = vi.fn();
    o.onDismiss = dismissSpy;
    const accepted = o.onPointerDown(1, 200, 150, 0);
    expect(accepted).toBe(false);
    expect(dismissSpy).not.toHaveBeenCalled();
  });

  it("skips invisible children when checking click target", () => {
    const o = new Overlay();
    o.width = 400;
    o.height = 300;
    const child = new Widget();
    child.x = 100;
    child.y = 100;
    child.width = 200;
    child.height = 200;
    child.visible = false;
    o.addChild(child);
    const dismissSpy = vi.fn();
    o.onDismiss = dismissSpy;
    const accepted = o.onPointerDown(1, 150, 150, 0);
    expect(accepted).toBe(true);
    expect(dismissSpy).toHaveBeenCalledOnce();
  });

  it("draws backdrop", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const renderer = new Canvas2DRenderer(canvas);
    const o = new Overlay();
    o.width = 400;
    o.height = 300;
    o.backdropColor = 0x00000099;
    renderer.begin(400, 300);
    o.draw(renderer, makeFakeTheme());
    renderer.end();
  });

  it("does not draw backdrop when color is 0", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const renderer = new Canvas2DRenderer(canvas);
    const o = new Overlay();
    o.width = 400;
    o.height = 300;
    o.backdropColor = 0;
    const spy = vi.spyOn(renderer, "fillRect");
    renderer.begin(400, 300);
    o.draw(renderer, makeFakeTheme());
    renderer.end();
    expect(spy).not.toHaveBeenCalled();
  });
});
