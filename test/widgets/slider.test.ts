// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Slider } from "../../src/widgets/slider";
import { makeFakeTheme } from "../test-helpers";

describe("Slider", () => {
  describe("defaults", () => {
    it("starts with value 0, min 0, max 1", () => {
      const s = new Slider();
      expect(s.value).toBe(0);
      expect(s.min).toBe(0);
      expect(s.max).toBe(1);
    });

    it("starts with no onChange or onRelease", () => {
      const s = new Slider();
      expect(s.onChange).toBeNull();
      expect(s.onRelease).toBeNull();
    });
  });

  describe("pointer interaction", () => {
    it("accepts pointer down on left button", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      const accepted = s.onPointerDown(1, 100, 12, 0);
      expect(accepted).toBe(true);
    });

    it("rejects pointer down on non-left button", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      const accepted = s.onPointerDown(1, 100, 12, 2);
      expect(accepted).toBe(false);
    });

    it("rejects pointer down when disabled", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.enabled = false;
      const accepted = s.onPointerDown(1, 100, 12, 0);
      expect(accepted).toBe(false);
    });

    it("updates value on pointer down based on x position", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      const changeSpy = vi.fn();
      s.onChange = changeSpy;
      s.onPointerDown(1, 100, 12, 0);
      expect(changeSpy).toHaveBeenCalled();
      expect(s.value).toBe(50);
    });

    it("clamps value to min/max", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 10;
      s.max = 90;
      s.onPointerDown(1, 0, 12, 0);
      expect(s.value).toBe(10);
      s.onPointerDown(2, 200, 12, 0);
      expect(s.value).toBe(90);
    });

    it("updates value on pointer move during drag", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      s.onPointerDown(1, 50, 12, 0);
      s.onPointerMove(1, 150, 12);
      expect(s.value).toBe(75);
    });

    it("ignores pointer move from different pointer id", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      s.onPointerDown(1, 50, 12, 0);
      s.onPointerMove(2, 150, 12);
      expect(s.value).toBe(25);
    });

    it("stops dragging on pointer up", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      s.onPointerDown(1, 100, 12, 0);
      s.onPointerUp(1, 100, 12, 0);
      s.onPointerMove(1, 150, 12);
      expect(s.value).toBe(50);
    });

    it("calls onRelease when pointer up after drag", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      const releaseSpy = vi.fn();
      s.onRelease = releaseSpy;
      s.onPointerDown(1, 100, 12, 0);
      s.onPointerUp(1, 100, 12, 0);
      expect(releaseSpy).toHaveBeenCalledOnce();
    });

    it("does not call onRelease for non-matching pointer id", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      const releaseSpy = vi.fn();
      s.onRelease = releaseSpy;
      s.onPointerDown(1, 100, 12, 0);
      s.onPointerUp(2, 100, 12, 0);
      expect(releaseSpy).not.toHaveBeenCalled();
    });

    it("does not fire onChange when value doesn't change", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      s.value = 50;
      const changeSpy = vi.fn();
      s.onChange = changeSpy;
      s.onPointerDown(1, 100, 12, 0);
      expect(changeSpy).not.toHaveBeenCalled();
    });

    it("handles zero-width slider without error", () => {
      const s = new Slider();
      s.width = 0;
      s.height = 24;
      s.onPointerDown(1, 0, 12, 0);
      expect(s.value).toBe(0);
    });
  });

  describe("drawing", () => {
    /** draws the slider once onto a throwaway 200x30 canvas to exercise the draw path. */
    function drawSlider(s: Slider): void {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 30;
      const renderer = new Canvas2DRenderer(canvas);
      renderer.begin(200, 30);
      s.draw(renderer, makeFakeTheme());
      renderer.end();
    }

    it("draws track, fill, and thumb at 0%", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      s.value = 0;
      drawSlider(s);
    });

    it("draws track, fill, and thumb at 50%", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      s.value = 50;
      drawSlider(s);
    });

    it("draws track, fill, and thumb at 100%", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 0;
      s.max = 100;
      s.value = 100;
      drawSlider(s);
    });

    it("draws with zero range", () => {
      const s = new Slider();
      s.width = 200;
      s.height = 24;
      s.min = 50;
      s.max = 50;
      s.value = 50;
      drawSlider(s);
    });
  });
});
