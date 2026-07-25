// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Button } from "../../src/widgets/button";
import { makeFakeTheme } from "../test-helpers";

describe("Button", () => {
  describe("defaults", () => {
    it("starts focusable", () => {
      const b = new Button();
      expect(b.focusable).toBe(true);
    });

    it("starts not hovered and not pressed", () => {
      const b = new Button();
      expect(b.isHovered).toBe(false);
      expect(b.isPressed).toBe(false);
    });

    it("starts with no onClick", () => {
      const b = new Button();
      expect(b.onClick).toBeNull();
    });

    it("starts with empty text", () => {
      const b = new Button();
      expect(b.text).toBe("");
    });
  });

  describe("pointer interaction", () => {
    it("sets pressed on pointer down", () => {
      const b = new Button();
      b.width = 100;
      b.height = 30;
      b.onPointerDown(1, 50, 15, 0);
      expect(b.isPressed).toBe(true);
    });

    it("rejects pointer down when disabled", () => {
      const b = new Button();
      b.width = 100;
      b.height = 30;
      b.enabled = false;
      const accepted = b.onPointerDown(1, 50, 15, 0);
      expect(accepted).toBe(false);
      expect(b.isPressed).toBe(false);
    });

    it("fires onClick on pointer up while pressed", () => {
      const b = new Button();
      b.width = 100;
      b.height = 30;
      const clickSpy = vi.fn();
      b.onClick = clickSpy;
      b.onPointerDown(1, 50, 15, 0);
      b.onPointerUp(1, 50, 15, 0);
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(b.isPressed).toBe(false);
    });

    it("does not fire onClick when disabled", () => {
      const b = new Button();
      b.width = 100;
      b.height = 30;
      const clickSpy = vi.fn();
      b.onClick = clickSpy;
      b.onPointerDown(1, 50, 15, 0);
      b.enabled = false;
      b.onPointerUp(1, 50, 15, 0);
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("does not fire onClick when not pressed", () => {
      const b = new Button();
      b.width = 100;
      b.height = 30;
      const clickSpy = vi.fn();
      b.onClick = clickSpy;
      b.onPointerUp(1, 50, 15, 0);
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe("hover", () => {
    it("sets hovered on pointer enter", () => {
      const b = new Button();
      b.onPointerEnter();
      expect(b.isHovered).toBe(true);
    });

    it("clears hovered and pressed on pointer leave", () => {
      const b = new Button();
      b.width = 100;
      b.height = 30;
      b.onPointerDown(1, 50, 15, 0);
      b.onPointerEnter();
      b.onPointerLeave();
      expect(b.isHovered).toBe(false);
      expect(b.isPressed).toBe(false);
    });
  });

  describe("keyboard", () => {
    it("fires onClick on Enter key", () => {
      const b = new Button();
      const clickSpy = vi.fn();
      b.onClick = clickSpy;
      const handled = b.onKeyDown("Enter", "Enter", false, false, false);
      expect(handled).toBe(true);
      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it("fires onClick on Space key", () => {
      const b = new Button();
      const clickSpy = vi.fn();
      b.onClick = clickSpy;
      const handled = b.onKeyDown(" ", "Space", false, false, false);
      expect(handled).toBe(true);
      expect(clickSpy).toHaveBeenCalledOnce();
    });

    it("does not fire onClick on other keys", () => {
      const b = new Button();
      const clickSpy = vi.fn();
      b.onClick = clickSpy;
      const handled = b.onKeyDown("a", "KeyA", false, false, false);
      expect(handled).toBe(false);
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("does not fire onClick when disabled", () => {
      const b = new Button();
      b.enabled = false;
      const clickSpy = vi.fn();
      b.onClick = clickSpy;
      const handled = b.onKeyDown("Enter", "Enter", false, false, false);
      expect(handled).toBe(false);
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it("does not fire onClick when no handler set", () => {
      const b = new Button();
      const handled = b.onKeyDown("Enter", "Enter", false, false, false);
      expect(handled).toBe(false);
    });
  });

  describe("content measurement", () => {
    it("returns 0 content width when no text and no children", () => {
      const b = new Button();
      expect(b.getContentWidth()).toBe(0);
    });

    it("returns 0 content width when has children (delegates to layout)", () => {
      const b = new Button();
      b.text = "CLICK";
      const child = new Button();
      b.addChild(child);
      expect(b.getContentWidth()).toBe(0);
    });

    it("returns 0 content height with no font", () => {
      const b = new Button();
      b.text = "CLICK";
      expect(b.getContentHeight()).toBe(0);
    });
  });

  describe("drawing", () => {
    /** draws the button once onto a throwaway 200x40 canvas to exercise the draw path. */
    function drawButton(b: Button): void {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 40;
      const renderer = new Canvas2DRenderer(canvas);
      renderer.begin(200, 40);
      b.draw(renderer, makeFakeTheme());
      renderer.end();
    }

    it("draws with text centered", () => {
      const b = new Button();
      b.text = "CLICK";
      b.width = 100;
      b.height = 30;
      drawButton(b);
    });

    it("draws with border radius", () => {
      const b = new Button();
      b.text = "OK";
      b.width = 100;
      b.height = 30;
      b.borderRadius = 5;
      drawButton(b);
    });

    it("draws with border", () => {
      const b = new Button();
      b.text = "OK";
      b.width = 100;
      b.height = 30;
      b.borderColor = 0xff0000ff;
      b.borderWidth = 1;
      drawButton(b);
    });

    it("draws with border and border radius", () => {
      const b = new Button();
      b.width = 100;
      b.height = 30;
      b.borderColor = 0xff0000ff;
      b.borderWidth = 1;
      b.borderRadius = 5;
      drawButton(b);
    });

    it("draws hover state", () => {
      const b = new Button();
      b.text = "HOVER";
      b.width = 100;
      b.height = 30;
      b.onPointerEnter();
      drawButton(b);
    });

    it("draws pressed state", () => {
      const b = new Button();
      b.text = "PRESS";
      b.width = 100;
      b.height = 30;
      b.onPointerDown(1, 50, 15, 0);
      drawButton(b);
    });

    it("draws disabled state with reduced alpha", () => {
      const b = new Button();
      b.text = "DISABLED";
      b.width = 100;
      b.height = 30;
      b.enabled = false;
      drawButton(b);
    });

    it("draws without text (children only)", () => {
      const b = new Button();
      b.width = 100;
      b.height = 30;
      drawButton(b);
    });

    it("draws with autoFitScale", () => {
      const b = new Button();
      b.text = "SCALE";
      b.width = 100;
      b.height = 30;
      b.autoFitScale = true;
      b.computedScale = 1.5;
      drawButton(b);
    });
  });
});
