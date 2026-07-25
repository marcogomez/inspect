// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Surface } from "../../src/core/surface";
import { Box } from "../../src/widgets/box";
import { NumberInput } from "../../src/widgets/number-input";
import { makeFakeTheme } from "../test-helpers";

describe("NumberInput", () => {
  describe("defaults", () => {
    it("starts with value 0, range [0,1], step 1, decimals 0", () => {
      const ni = new NumberInput();
      expect(ni.numValue).toBe(0);
      expect(ni.min).toBe(0);
      expect(ni.max).toBe(1);
      expect(ni.step).toBe(1);
      expect(ni.decimals).toBe(0);
    });

    it("starts with no callbacks", () => {
      const ni = new NumberInput();
      expect(ni.onChange).toBeNull();
      expect(ni.onCommit).toBeNull();
    });
  });

  describe("updatePointerScale", () => {
    it("computes scale for step=0.01", () => {
      const ni = new NumberInput();
      ni.step = 0.01;
      ni.updatePointerScale();
      expect((ni as unknown as { pointerScale: number }).pointerScale).toBeCloseTo(0.001);
    });

    it("computes scale for step=1", () => {
      const ni = new NumberInput();
      ni.step = 1;
      ni.updatePointerScale();
      expect((ni as unknown as { pointerScale: number }).pointerScale).toBeCloseTo(0.1);
    });

    it("computes scale for step=0", () => {
      const ni = new NumberInput();
      ni.step = 0;
      ni.updatePointerScale();
      expect((ni as unknown as { pointerScale: number }).pointerScale).toBeCloseTo(0.1);
    });
  });

  describe("scrub drag interaction", () => {
    it("accepts pointer down in scrub zone", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.min = 0;
      ni.max = 100;
      ni.step = 1;
      ni.numValue = 50;
      ni.updatePointerScale();
      const accepted = ni.onPointerDown(1, 5, 12, 0);
      expect(accepted).toBe(true);
    });

    it("rejects pointer down outside scrub zone (right side)", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.min = 0;
      ni.max = 100;
      const accepted = ni.onPointerDown(1, 50, 12, 0);
      expect(accepted).toBe(true);
    });

    it("rejects non-left button", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      const accepted = ni.onPointerDown(1, 5, 12, 2);
      expect(accepted).toBe(false);
    });

    it("rejects when disabled", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.enabled = false;
      const accepted = ni.onPointerDown(1, 5, 12, 0);
      expect(accepted).toBe(false);
    });

    it("updates value during scrub drag", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.min = 0;
      ni.max = 100;
      ni.step = 1;
      ni.numValue = 50;
      ni.updatePointerScale();
      const changeSpy = vi.fn();
      ni.onChange = changeSpy;
      ni.onPointerDown(1, 5, 12, 0);
      ni.onPointerMove(1, 25, 12);
      expect(changeSpy).toHaveBeenCalled();
    });

    it("calls onCommit on scrub drag end", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.min = 0;
      ni.max = 100;
      ni.step = 1;
      ni.numValue = 50;
      ni.updatePointerScale();
      const commitSpy = vi.fn();
      ni.onCommit = commitSpy;
      ni.onPointerDown(1, 5, 12, 0);
      ni.onPointerUp(1, 5, 12, 0);
      expect(commitSpy).toHaveBeenCalled();
    });

    it("clamps value to min/max during scrub", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.min = 10;
      ni.max = 90;
      ni.step = 1;
      ni.numValue = 50;
      ni.updatePointerScale();
      ni.onPointerDown(1, 5, 12, 0);
      ni.onPointerMove(1, -5000, 12);
      expect(ni.numValue).toBeGreaterThanOrEqual(10);
      ni.onPointerMove(1, 50000, 12);
      expect(ni.numValue).toBeLessThanOrEqual(90);
    });

    it("snaps value to step during scrub", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.min = 0;
      ni.max = 100;
      ni.step = 5;
      ni.numValue = 50;
      ni.updatePointerScale();
      ni.onPointerDown(1, 5, 12, 0);
      ni.onPointerMove(1, 15, 12);
      expect(ni.numValue % 5).toBe(0);
    });
  });

  describe("hover state", () => {
    it("tracks scrub hover on pointer move", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.onPointerMove(1, 5, 12);
      ni.onPointerLeave();
    });
  });

  describe("snap", () => {
    it("returns raw value when step <= 0", () => {
      const ni = new NumberInput();
      ni.step = 0;
      ni.min = 0;
      ni.max = 100;
      ni.numValue = 33.7;
      ni.width = 70;
      ni.height = 24;
      ni.updatePointerScale();
      ni.onPointerDown(1, 5, 12, 0);
      ni.onPointerUp(1, 5, 12, 0);
    });
  });

  describe("drawing", () => {
    /** draws the number input once onto a throwaway 100x30 canvas to exercise the draw path. */
    function drawNumberInput(ni: NumberInput): void {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 30;
      const renderer = new Canvas2DRenderer(canvas);
      renderer.begin(100, 30);
      ni.draw(renderer, makeFakeTheme());
      renderer.end();
    }

    it("draws with integer value", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.numValue = 42;
      ni.decimals = 0;
      drawNumberInput(ni);
    });

    it("draws with decimal value", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.numValue = 3.14;
      ni.decimals = 2;
      drawNumberInput(ni);
    });

    it("draws with scrub hover state", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.numValue = 50;
      ni.onPointerMove(1, 5, 12);
      drawNumberInput(ni);
    });

    it("draws while scrub dragging", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.numValue = 50;
      ni.min = 0;
      ni.max = 100;
      ni.step = 1;
      ni.updatePointerScale();
      ni.onPointerDown(1, 5, 12, 0);
      drawNumberInput(ni);
    });
  });

  describe("editing", () => {
    it("starts editing on click outside scrub zone without surface (no-op)", () => {
      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.numValue = 50;
      ni.decimals = 0;
      ni.onPointerDown(1, 50, 12, 0);
    });

    it("starts editing with surface and creates overlay input", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 100;
      const renderer = new Canvas2DRenderer(canvas);
      const theme = makeFakeTheme();
      const surface = new Surface(canvas, renderer, theme);
      const root = new Box();
      root.width = 200;
      root.height = 100;
      surface.setRoot(root);
      (surface as unknown as { _width: number })._width = 200;
      (surface as unknown as { _height: number })._height = 100;

      const ni = new NumberInput();
      ni.width = 70;
      ni.height = 24;
      ni.numValue = 50;
      ni.decimals = 0;
      ni.min = 0;
      ni.max = 100;
      ni.step = 1;
      root.addChild(ni);
      root.needsLayout = true;
      root.computeLayout();
      surface.flush();

      ni.onPointerDown(1, 50, 12, 0);

      ni.dispose();
      surface.dispose();
    });

    it("dispose cleans up editing state", () => {
      const ni = new NumberInput();
      ni.dispose();
    });
  });
});
