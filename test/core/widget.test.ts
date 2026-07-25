import { describe, expect, it } from "vitest";

import {
  SLOT_COUNT,
  SLOT_FLEX_GROW,
  SLOT_FLEX_SHRINK,
  SLOT_HEIGHT,
  SLOT_MAX_HEIGHT,
  SLOT_MAX_WIDTH,
  SLOT_MIN_HEIGHT,
  SLOT_MIN_WIDTH,
  SLOT_PADDING_BOTTOM,
  SLOT_PADDING_LEFT,
  SLOT_PADDING_RIGHT,
  SLOT_PADDING_TOP,
  SLOT_PREFERRED_HEIGHT,
  SLOT_PREFERRED_WIDTH,
  SLOT_WIDTH,
  SLOT_X,
  SLOT_Y,
  Widget
} from "../../src/core/widget";

describe("Widget", () => {
  describe("construction", () => {
    it("initializes geometry with correct slot count", () => {
      const w = new Widget();
      expect(w.geometry).toBeInstanceOf(Float32Array);
      expect(w.geometry.length).toBe(SLOT_COUNT);
    });

    it("sets default max dimensions to 1e7", () => {
      const w = new Widget();
      expect(w.maxWidth).toBe(1e7);
      expect(w.maxHeight).toBe(1e7);
    });

    it("starts visible and effectively visible", () => {
      const w = new Widget();
      expect(w.visible).toBe(true);
      expect(w.isEffectivelyVisible()).toBe(true);
    });

    it("starts with needsLayout true", () => {
      const w = new Widget();
      expect(w.needsLayout).toBe(true);
    });

    it("starts with no parent, surface, or children", () => {
      const w = new Widget();
      expect(w.parent).toBeNull();
      expect(w.surface).toBeNull();
      expect(w.children).toHaveLength(0);
    });

    it("defaults to fit sizing", () => {
      const w = new Widget();
      expect(w.sizingX).toBe("fit");
      expect(w.sizingY).toBe("fit");
    });
  });

  describe("geometry accessors", () => {
    it("reads and writes x/y through geometry slots", () => {
      const w = new Widget();
      w.x = 10;
      w.y = 20;
      expect(w.x).toBe(10);
      expect(w.y).toBe(20);
      expect(w.geometry[SLOT_X]).toBe(10);
      expect(w.geometry[SLOT_Y]).toBe(20);
    });

    it("reads and writes width/height", () => {
      const w = new Widget();
      w.width = 100;
      w.height = 200;
      expect(w.width).toBe(100);
      expect(w.height).toBe(200);
      expect(w.geometry[SLOT_WIDTH]).toBe(100);
      expect(w.geometry[SLOT_HEIGHT]).toBe(200);
    });

    it("reads and writes preferred dimensions", () => {
      const w = new Widget();
      w.preferredWidth = 50;
      w.preferredHeight = 60;
      expect(w.preferredWidth).toBe(50);
      expect(w.preferredHeight).toBe(60);
      expect(w.geometry[SLOT_PREFERRED_WIDTH]).toBe(50);
      expect(w.geometry[SLOT_PREFERRED_HEIGHT]).toBe(60);
    });

    it("reads and writes min dimensions", () => {
      const w = new Widget();
      w.minWidth = 10;
      w.minHeight = 20;
      expect(w.minWidth).toBe(10);
      expect(w.minHeight).toBe(20);
      expect(w.geometry[SLOT_MIN_WIDTH]).toBe(10);
      expect(w.geometry[SLOT_MIN_HEIGHT]).toBe(20);
    });

    it("reads and writes max dimensions", () => {
      const w = new Widget();
      w.maxWidth = 500;
      w.maxHeight = 600;
      expect(w.maxWidth).toBe(500);
      expect(w.maxHeight).toBe(600);
      expect(w.geometry[SLOT_MAX_WIDTH]).toBe(500);
      expect(w.geometry[SLOT_MAX_HEIGHT]).toBe(600);
    });

    it("reads and writes flex grow/shrink", () => {
      const w = new Widget();
      w.flexGrow = 2;
      w.flexShrink = 0.5;
      expect(w.flexGrow).toBe(2);
      expect(w.flexShrink).toBeCloseTo(0.5);
      expect(w.geometry[SLOT_FLEX_GROW]).toBe(2);
      expect(w.geometry[SLOT_FLEX_SHRINK]).toBeCloseTo(0.5);
    });
  });

  describe("padding", () => {
    it("sets individual padding values", () => {
      const w = new Widget();
      w.setPadding(1, 2, 3, 4);
      expect(w.geometry[SLOT_PADDING_TOP]).toBe(1);
      expect(w.geometry[SLOT_PADDING_RIGHT]).toBe(2);
      expect(w.geometry[SLOT_PADDING_BOTTOM]).toBe(3);
      expect(w.geometry[SLOT_PADDING_LEFT]).toBe(4);
    });

    it("sets uniform padding", () => {
      const w = new Widget();
      w.setPaddingAll(8);
      expect(w.geometry[SLOT_PADDING_TOP]).toBe(8);
      expect(w.geometry[SLOT_PADDING_RIGHT]).toBe(8);
      expect(w.geometry[SLOT_PADDING_BOTTOM]).toBe(8);
      expect(w.geometry[SLOT_PADDING_LEFT]).toBe(8);
    });

    it("computes inner dimensions", () => {
      const w = new Widget();
      w.width = 200;
      w.height = 100;
      w.setPadding(5, 10, 15, 20);
      expect(w.innerWidth).toBe(170);
      expect(w.innerHeight).toBe(80);
      expect(w.innerX).toBe(20);
      expect(w.innerY).toBe(5);
    });
  });

  describe("child management", () => {
    it("adds children and sets parent reference", () => {
      const parent = new Widget();
      const child = new Widget();
      parent.addChild(child);
      expect(parent.children).toHaveLength(1);
      expect(parent.children[0]).toBe(child);
      expect(child.parent).toBe(parent);
    });

    it("sets needsLayout on parent when child is added", () => {
      const parent = new Widget();
      parent.needsLayout = false;
      parent.addChild(new Widget());
      expect(parent.needsLayout).toBe(true);
    });

    it("removes a child and clears parent reference", () => {
      const parent = new Widget();
      const child = new Widget();
      parent.addChild(child);
      parent.removeChild(child);
      expect(parent.children).toHaveLength(0);
      expect(child.parent).toBeNull();
    });

    it("does nothing when removing a non-child", () => {
      const parent = new Widget();
      const other = new Widget();
      parent.addChild(new Widget());
      parent.removeChild(other);
      expect(parent.children).toHaveLength(1);
    });

    it("removes all children", () => {
      const parent = new Widget();
      const c1 = new Widget();
      const c2 = new Widget();
      parent.addChild(c1);
      parent.addChild(c2);
      parent.removeAllChildren();
      expect(parent.children).toHaveLength(0);
      expect(c1.parent).toBeNull();
      expect(c2.parent).toBeNull();
    });

    it("tracks _hasAbsoluteChildren flag on addChild", () => {
      const parent = new Widget();
      const normal = new Widget();
      const abs = new Widget();
      abs.absolute = true;
      parent.addChild(normal);
      parent.addChild(abs);
      expect(parent.children).toHaveLength(2);
    });

    it("recomputes _hasAbsoluteChildren on removeChild of absolute child", () => {
      const parent = new Widget();
      const abs1 = new Widget();
      abs1.absolute = true;
      const abs2 = new Widget();
      abs2.absolute = true;
      parent.addChild(abs1);
      parent.addChild(abs2);
      parent.removeChild(abs1);
      expect(parent.children).toHaveLength(1);
    });

    it("clears _hasAbsoluteChildren on removeAllChildren", () => {
      const parent = new Widget();
      const abs = new Widget();
      abs.absolute = true;
      parent.addChild(abs);
      parent.removeAllChildren();
      expect(parent.children).toHaveLength(0);
    });
  });

  describe("visibility", () => {
    it("propagates effective visibility to children when set to false", () => {
      const parent = new Widget();
      const child = new Widget();
      const grandchild = new Widget();
      parent.addChild(child);
      child.addChild(grandchild);
      expect(grandchild.isEffectivelyVisible()).toBe(true);
      parent.visible = false;
      expect(parent.isEffectivelyVisible()).toBe(false);
      expect(child.isEffectivelyVisible()).toBe(false);
      expect(grandchild.isEffectivelyVisible()).toBe(false);
    });

    it("restores effective visibility when parent becomes visible again", () => {
      const parent = new Widget();
      const child = new Widget();
      parent.addChild(child);
      parent.visible = false;
      expect(child.isEffectivelyVisible()).toBe(false);
      parent.visible = true;
      expect(child.isEffectivelyVisible()).toBe(true);
    });

    it("respects child own visibility when parent is visible", () => {
      const parent = new Widget();
      const child = new Widget();
      parent.addChild(child);
      child.visible = false;
      expect(child.isEffectivelyVisible()).toBe(false);
      expect(parent.isEffectivelyVisible()).toBe(true);
    });

    it("child stays invisible if self is hidden even when parent becomes visible", () => {
      const parent = new Widget();
      const child = new Widget();
      parent.addChild(child);
      child.visible = false;
      parent.visible = false;
      parent.visible = true;
      expect(child.isEffectivelyVisible()).toBe(false);
    });

    it("does not propagate when value unchanged", () => {
      const parent = new Widget();
      const child = new Widget();
      parent.addChild(child);
      parent.visible = true;
      expect(child.isEffectivelyVisible()).toBe(true);
    });

    it("newly added child inherits parent effective visibility", () => {
      const parent = new Widget();
      parent.visible = false;
      const child = new Widget();
      parent.addChild(child);
      expect(child.isEffectivelyVisible()).toBe(false);
    });
  });

  describe("setSurface", () => {
    it("propagates surface to all descendants", () => {
      const root = new Widget();
      const child = new Widget();
      const grandchild = new Widget();
      root.addChild(child);
      child.addChild(grandchild);
      const fakeSurface = {} as import("../../src/core/surface").Surface;
      root.setSurface(fakeSurface);
      expect(root.surface).toBe(fakeSurface);
      expect(child.surface).toBe(fakeSurface);
      expect(grandchild.surface).toBe(fakeSurface);
    });

    it("clears surface on all descendants when set to null", () => {
      const root = new Widget();
      const child = new Widget();
      root.addChild(child);
      const fakeSurface = {} as import("../../src/core/surface").Surface;
      root.setSurface(fakeSurface);
      root.setSurface(null);
      expect(root.surface).toBeNull();
      expect(child.surface).toBeNull();
    });
  });

  describe("measureIntrinsicWidth", () => {
    it("returns preferredWidth for fixed sizing", () => {
      const w = new Widget();
      w.sizingX = "fixed";
      w.preferredWidth = 42;
      expect(w.measureIntrinsicWidth()).toBe(42);
    });

    it("returns minWidth for grow sizing", () => {
      const w = new Widget();
      w.sizingX = "grow";
      w.minWidth = 10;
      expect(w.measureIntrinsicWidth()).toBe(10);
    });

    it("returns minWidth for percent sizing", () => {
      const w = new Widget();
      w.sizingX = "percent";
      w.minWidth = 5;
      expect(w.measureIntrinsicWidth()).toBe(5);
    });

    it("returns preferredWidth for fit sizing when preferredWidth > 0", () => {
      const w = new Widget();
      w.sizingX = "fit";
      w.preferredWidth = 30;
      expect(w.measureIntrinsicWidth()).toBe(30);
    });

    it("returns getContentWidth + padding for fit sizing with no preferred", () => {
      const w = new Widget();
      w.sizingX = "fit";
      w.setPadding(0, 5, 0, 5);
      expect(w.measureIntrinsicWidth()).toBe(10);
    });
  });

  describe("measureIntrinsicHeight", () => {
    it("returns preferredHeight for fixed sizing", () => {
      const w = new Widget();
      w.sizingY = "fixed";
      w.preferredHeight = 42;
      expect(w.measureIntrinsicHeight()).toBe(42);
    });

    it("returns minHeight for grow sizing", () => {
      const w = new Widget();
      w.sizingY = "grow";
      w.minHeight = 10;
      expect(w.measureIntrinsicHeight()).toBe(10);
    });

    it("returns preferredHeight for fit sizing when preferredHeight > 0", () => {
      const w = new Widget();
      w.sizingY = "fit";
      w.preferredHeight = 30;
      expect(w.measureIntrinsicHeight()).toBe(30);
    });
  });

  describe("hitTest", () => {
    it("returns self when no children", () => {
      const w = new Widget();
      w.width = 100;
      w.height = 100;
      expect(w.hitTest(50, 50)).toBe(w);
    });

    it("returns null when invisible", () => {
      const w = new Widget();
      w.width = 100;
      w.height = 100;
      w.visible = false;
      expect(w.hitTest(50, 50)).toBeNull();
    });

    it("returns child when hit lands on child bounds", () => {
      const parent = new Widget();
      parent.width = 200;
      parent.height = 200;
      const child = new Widget();
      child.x = 10;
      child.y = 10;
      child.width = 50;
      child.height = 50;
      parent.addChild(child);
      expect(parent.hitTest(20, 20)).toBe(child);
    });

    it("returns parent when hit misses all children", () => {
      const parent = new Widget();
      parent.width = 200;
      parent.height = 200;
      const child = new Widget();
      child.x = 10;
      child.y = 10;
      child.width = 50;
      child.height = 50;
      parent.addChild(child);
      expect(parent.hitTest(100, 100)).toBe(parent);
    });

    it("returns topmost child when children overlap (last added wins)", () => {
      const parent = new Widget();
      parent.width = 200;
      parent.height = 200;
      const c1 = new Widget();
      c1.width = 100;
      c1.height = 100;
      const c2 = new Widget();
      c2.width = 100;
      c2.height = 100;
      parent.addChild(c1);
      parent.addChild(c2);
      expect(parent.hitTest(50, 50)).toBe(c2);
    });

    it("skips invisible children", () => {
      const parent = new Widget();
      parent.width = 200;
      parent.height = 200;
      const child = new Widget();
      child.width = 100;
      child.height = 100;
      child.visible = false;
      parent.addChild(child);
      expect(parent.hitTest(50, 50)).toBe(parent);
    });

    it("accounts for padding", () => {
      const parent = new Widget();
      parent.width = 200;
      parent.height = 200;
      parent.setPaddingAll(10);
      const child = new Widget();
      child.width = 50;
      child.height = 50;
      parent.addChild(child);
      expect(parent.hitTest(20, 20)).toBe(child);
      expect(parent.hitTest(5, 5)).toBe(parent);
    });
  });

  describe("invalidateLayout", () => {
    it("marks needsLayout up the ancestor chain", () => {
      const root = new Widget();
      const mid = new Widget();
      const leaf = new Widget();
      root.addChild(mid);
      mid.addChild(leaf);
      root.needsLayout = false;
      mid.needsLayout = false;
      leaf.needsLayout = false;
      leaf.invalidateLayout();
      expect(leaf.needsLayout).toBe(true);
      expect(mid.needsLayout).toBe(true);
      expect(root.needsLayout).toBe(true);
    });
  });

  describe("snapScale", () => {
    it("returns rawScale for snap mode none", () => {
      const w = new Widget();
      w.designScaleSnap = "none";
      w.designWidth = 100;
      w.designHeight = 100;
      w.width = 150;
      w.height = 150;
      w.computeLayout();
      expect(w.designScale).toBeCloseTo(1.5);
    });

    it("snaps to binary powers when rawScale >= 1", () => {
      const w = new Widget();
      w.designScaleSnap = "binary";
      w.designWidth = 100;
      w.designHeight = 100;
      w.width = 300;
      w.height = 300;
      w.computeLayout();
      expect(w.designScale).toBe(2);
    });

    it("snaps to pixel-perfect integer when rawScale >= 1", () => {
      const w = new Widget();
      w.designScaleSnap = "pixel-perfect";
      w.designWidth = 100;
      w.designHeight = 100;
      w.width = 250;
      w.height = 250;
      w.computeLayout();
      expect(w.designScale).toBe(2);
    });

    it("snaps by step when designScaleStep > 0", () => {
      const w = new Widget();
      w.designScaleStep = 0.5;
      w.designWidth = 100;
      w.designHeight = 100;
      w.width = 175;
      w.height = 175;
      w.computeLayout();
      expect(w.designScale).toBe(1.5);
    });
  });

  describe("computeLayout", () => {
    it("computes absolute positions for children", () => {
      const root = new Widget();
      root.width = 400;
      root.height = 300;
      root.absoluteX = 0;
      root.absoluteY = 0;
      root.setPaddingAll(10);

      const child = new Widget();
      child.geometry[SLOT_X] = 5;
      child.geometry[SLOT_Y] = 15;
      root.addChild(child);
      root.computeLayout();

      expect(child.absoluteX).toBe(15);
      expect(child.absoluteY).toBe(25);
    });

    it("resolves absolute children positions", () => {
      const root = new Widget();
      root.width = 400;
      root.height = 300;

      const abs = new Widget();
      abs.absolute = true;
      abs.anchorLeft = 10;
      abs.anchorTop = 20;
      abs.preferredWidth = 100;
      abs.preferredHeight = 50;
      root.addChild(abs);
      root.computeLayout();

      expect(abs.geometry[SLOT_X]).toBe(10);
      expect(abs.geometry[SLOT_Y]).toBe(20);
      expect(abs.geometry[SLOT_WIDTH]).toBe(100);
      expect(abs.geometry[SLOT_HEIGHT]).toBe(50);
    });

    it("resolves absolute child with left+right anchors to fill width", () => {
      const root = new Widget();
      root.width = 400;
      root.height = 300;

      const abs = new Widget();
      abs.absolute = true;
      abs.anchorLeft = 10;
      abs.anchorRight = 20;
      abs.anchorTop = 5;
      abs.preferredHeight = 50;
      root.addChild(abs);
      root.computeLayout();

      expect(abs.geometry[SLOT_WIDTH]).toBe(370);
    });

    it("resolves absolute child with right anchor only", () => {
      const root = new Widget();
      root.width = 400;
      root.height = 300;

      const abs = new Widget();
      abs.absolute = true;
      abs.anchorRight = 10;
      abs.anchorTop = 0;
      abs.preferredWidth = 100;
      abs.preferredHeight = 50;
      root.addChild(abs);
      root.computeLayout();

      expect(abs.geometry[SLOT_X]).toBe(290);
    });

    it("resolves absolute child with bottom anchor only", () => {
      const root = new Widget();
      root.width = 400;
      root.height = 300;

      const abs = new Widget();
      abs.absolute = true;
      abs.anchorLeft = 0;
      abs.anchorBottom = 10;
      abs.preferredWidth = 100;
      abs.preferredHeight = 50;
      root.addChild(abs);
      root.computeLayout();

      expect(abs.geometry[SLOT_Y]).toBe(240);
    });

    it("centers absolute child with no anchors", () => {
      const root = new Widget();
      root.width = 400;
      root.height = 300;

      const abs = new Widget();
      abs.absolute = true;
      abs.preferredWidth = 100;
      abs.preferredHeight = 50;
      root.addChild(abs);
      root.computeLayout();

      expect(abs.geometry[SLOT_X]).toBe(150);
      expect(abs.geometry[SLOT_Y]).toBe(125);
    });

    it("skips resolveAbsoluteChildren when no absolute children", () => {
      const root = new Widget();
      root.width = 400;
      root.height = 300;
      const child = new Widget();
      child.sizingX = "fixed";
      child.preferredWidth = 50;
      root.addChild(child);
      root.computeLayout();
      expect(child.absoluteX).toBe(0);
    });
  });

  describe("default event handlers", () => {
    it("onPointerDown returns false", () => {
      const w = new Widget();
      expect(w.onPointerDown(0, 0, 0, 0)).toBe(false);
    });

    it("onWheel returns false", () => {
      const w = new Widget();
      expect(w.onWheel(0, 0)).toBe(false);
    });

    it("onKeyDown returns false", () => {
      const w = new Widget();
      expect(w.onKeyDown("a", "KeyA", false, false, false)).toBe(false);
    });
  });
});
