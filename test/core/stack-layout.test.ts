import { describe, expect, it } from "vitest";

import { StackLayout } from "../../src/core/layouts/stack-layout";
import { SLOT_HEIGHT, SLOT_WIDTH, SLOT_X, SLOT_Y, Widget } from "../../src/core/widget";

/** creates a w by h container widget using the given layout, flagged for layout. */
function makeContainer(w: number, h: number, layout: StackLayout): Widget {
  const c = new Widget();
  c.width = w;
  c.height = h;
  c.layout = layout;
  c.needsLayout = true;
  return c;
}

/** creates a child widget, applying only the sizing, flex, and constraint fields present in opts. */
function makeChild(opts: {
  sizingX?: "fit" | "grow" | "fixed" | "percent";
  sizingY?: "fit" | "grow" | "fixed" | "percent";
  preferredWidth?: number;
  preferredHeight?: number;
  minWidth?: number;
  minHeight?: number;
  flexGrow?: number;
  flexShrink?: number;
  percentWidth?: number;
  percentHeight?: number;
  alignSelf?: "start" | "center" | "end" | "stretch" | null;
  visible?: boolean;
  absolute?: boolean;
}): Widget {
  const w = new Widget();
  if (opts.sizingX) {
    w.sizingX = opts.sizingX;
  }
  if (opts.sizingY) {
    w.sizingY = opts.sizingY;
  }
  if (opts.preferredWidth !== undefined) {
    w.preferredWidth = opts.preferredWidth;
  }
  if (opts.preferredHeight !== undefined) {
    w.preferredHeight = opts.preferredHeight;
  }
  if (opts.minWidth !== undefined) {
    w.minWidth = opts.minWidth;
  }
  if (opts.minHeight !== undefined) {
    w.minHeight = opts.minHeight;
  }
  if (opts.flexGrow !== undefined) {
    w.flexGrow = opts.flexGrow;
  }
  if (opts.flexShrink !== undefined) {
    w.flexShrink = opts.flexShrink;
  }
  if (opts.percentWidth !== undefined) {
    w.percentWidth = opts.percentWidth;
  }
  if (opts.percentHeight !== undefined) {
    w.percentHeight = opts.percentHeight;
  }
  if (opts.alignSelf !== undefined) {
    w.alignSelf = opts.alignSelf;
  }
  if (opts.visible !== undefined) {
    w.visible = opts.visible;
  }
  if (opts.absolute !== undefined) {
    w.absolute = opts.absolute;
  }
  return w;
}

describe("StackLayout", () => {
  describe("constructor", () => {
    it("stores direction, gap, justify, align, wrap, runGap", () => {
      const l = new StackLayout("horizontal", 4, "center", "end", true, 8);
      expect(l.direction).toBe("horizontal");
      expect(l.gap).toBe(4);
      expect(l.justify).toBe("center");
      expect(l.align).toBe("end");
      expect(l.wrap).toBe(true);
      expect(l.runGap).toBe(8);
    });

    it("defaults gap=0, justify=start, align=stretch, wrap=false, runGap=0", () => {
      const l = new StackLayout("vertical");
      expect(l.gap).toBe(0);
      expect(l.justify).toBe("start");
      expect(l.align).toBe("stretch");
      expect(l.wrap).toBe(false);
      expect(l.runGap).toBe(0);
    });
  });

  describe("measureWidth", () => {
    it("horizontal: sums intrinsic widths + gaps", () => {
      const l = new StackLayout("horizontal", 10);
      const c = makeContainer(500, 300, l);
      c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 50 }));
      c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 60 }));
      expect(l.measureWidth(c)).toBe(120);
    });

    it("vertical: returns max intrinsic width", () => {
      const l = new StackLayout("vertical");
      const c = makeContainer(500, 300, l);
      c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 50 }));
      c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 80 }));
      expect(l.measureWidth(c)).toBe(80);
    });

    it("skips invisible children", () => {
      const l = new StackLayout("horizontal", 10);
      const c = makeContainer(500, 300, l);
      c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 50 }));
      c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 60, visible: false }));
      expect(l.measureWidth(c)).toBe(50);
    });

    it("skips absolute children", () => {
      const l = new StackLayout("horizontal", 10);
      const c = makeContainer(500, 300, l);
      c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 50 }));
      c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 60, absolute: true }));
      expect(l.measureWidth(c)).toBe(50);
    });
  });

  describe("measureHeight", () => {
    it("vertical: sums intrinsic heights + gaps", () => {
      const l = new StackLayout("vertical", 5);
      const c = makeContainer(500, 500, l);
      c.addChild(makeChild({ sizingY: "fixed", preferredHeight: 30 }));
      c.addChild(makeChild({ sizingY: "fixed", preferredHeight: 40 }));
      expect(l.measureHeight(c)).toBe(75);
    });

    it("horizontal: returns max intrinsic height", () => {
      const l = new StackLayout("horizontal");
      const c = makeContainer(500, 500, l);
      c.addChild(makeChild({ sizingY: "fixed", preferredHeight: 30 }));
      c.addChild(makeChild({ sizingY: "fixed", preferredHeight: 50 }));
      expect(l.measureHeight(c)).toBe(50);
    });

    it("skips invisible and absolute children", () => {
      const l = new StackLayout("vertical", 5);
      const c = makeContainer(500, 500, l);
      c.addChild(makeChild({ sizingY: "fixed", preferredHeight: 30 }));
      c.addChild(makeChild({ sizingY: "fixed", preferredHeight: 40, visible: false }));
      c.addChild(makeChild({ sizingY: "fixed", preferredHeight: 50, absolute: true }));
      expect(l.measureHeight(c)).toBe(30);
    });
  });

  describe("horizontal layout — fixed children", () => {
    it("positions fixed-width children sequentially", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 60 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(0);
      expect(c1.geometry[SLOT_WIDTH]).toBe(80);
      expect(c2.geometry[SLOT_X]).toBe(80);
      expect(c2.geometry[SLOT_WIDTH]).toBe(60);
    });

    it("applies gap between children", () => {
      const l = new StackLayout("horizontal", 10, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 60 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(0);
      expect(c2.geometry[SLOT_X]).toBe(90);
    });

    it("stretches children to full cross size by default", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_HEIGHT]).toBe(100);
    });
  });

  describe("vertical layout — fixed children", () => {
    it("positions fixed-height children sequentially", () => {
      const l = new StackLayout("vertical", 0, "start", "stretch");
      const c = makeContainer(200, 400, l);
      const c1 = makeChild({ sizingY: "fixed", preferredHeight: 50 });
      const c2 = makeChild({ sizingY: "fixed", preferredHeight: 30 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_Y]).toBe(0);
      expect(c1.geometry[SLOT_HEIGHT]).toBe(50);
      expect(c2.geometry[SLOT_Y]).toBe(50);
      expect(c2.geometry[SLOT_HEIGHT]).toBe(30);
    });

    it("stretches children to full cross width by default", () => {
      const l = new StackLayout("vertical", 0, "start", "stretch");
      const c = makeContainer(200, 400, l);
      const c1 = makeChild({ sizingY: "fixed", preferredHeight: 50 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(200);
    });
  });

  describe("grow sizing", () => {
    it("distributes remaining space equally among grow children", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "grow" });
      const c2 = makeChild({ sizingX: "grow" });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(150);
      expect(c2.geometry[SLOT_WIDTH]).toBe(150);
    });

    it("distributes by flex weight", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "grow", flexGrow: 2 });
      const c2 = makeChild({ sizingX: "grow", flexGrow: 1 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(200);
      expect(c2.geometry[SLOT_WIDTH]).toBe(100);
    });

    it("grow fills remaining space after fixed children", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 100 });
      const c2 = makeChild({ sizingX: "grow" });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(100);
      expect(c2.geometry[SLOT_WIDTH]).toBe(200);
    });

    it("non-grow child with flexGrow participates in grow distribution", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 50, flexGrow: 1 });
      const c2 = makeChild({ sizingX: "grow", flexGrow: 1 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(175);
      expect(c2.geometry[SLOT_WIDTH]).toBe(125);
    });
  });

  describe("percent sizing", () => {
    it("allocates percentage of available space", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(400, 100, l);
      const c1 = makeChild({ sizingX: "percent", percentWidth: 0.25 });
      const c2 = makeChild({ sizingX: "percent", percentWidth: 0.75 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(100);
      expect(c2.geometry[SLOT_WIDTH]).toBe(300);
    });
  });

  describe("justify", () => {
    it("center: centers children", () => {
      const l = new StackLayout("horizontal", 0, "center", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 100 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(100);
    });

    it("end: right-aligns children", () => {
      const l = new StackLayout("horizontal", 0, "end", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 100 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(200);
    });
  });

  describe("cross-axis alignment", () => {
    it("start: aligns children at start", () => {
      const l = new StackLayout("horizontal", 0, "start", "start");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_Y]).toBe(0);
      expect(c1.geometry[SLOT_HEIGHT]).toBe(40);
    });

    it("center: centers children on cross axis", () => {
      const l = new StackLayout("horizontal", 0, "start", "center");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_Y]).toBe(30);
      expect(c1.geometry[SLOT_HEIGHT]).toBe(40);
    });

    it("end: aligns children at end of cross axis", () => {
      const l = new StackLayout("horizontal", 0, "start", "end");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_Y]).toBe(60);
      expect(c1.geometry[SLOT_HEIGHT]).toBe(40);
    });

    it("alignSelf overrides container align", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({
        sizingX: "fixed",
        preferredWidth: 80,
        sizingY: "fixed",
        preferredHeight: 40,
        alignSelf: "center"
      });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_Y]).toBe(30);
      expect(c1.geometry[SLOT_HEIGHT]).toBe(40);
    });
  });

  describe("min/max constraints", () => {
    it("clamps size to minWidth", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(100, 100, l);
      const c1 = makeChild({ sizingX: "grow", minWidth: 80 });
      const c2 = makeChild({ sizingX: "grow", minWidth: 80 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBeGreaterThanOrEqual(80);
      expect(c2.geometry[SLOT_WIDTH]).toBeGreaterThanOrEqual(80);
    });

    it("clamps size to maxWidth", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(500, 100, l);
      const c1 = makeChild({ sizingX: "grow" });
      c1.maxWidth = 100;
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(100);
    });
  });

  describe("flex shrink / compression", () => {
    it("shrinks children when content overflows", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(100, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, flexShrink: 1 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 80, flexShrink: 1 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(50);
      expect(c2.geometry[SLOT_WIDTH]).toBe(50);
    });

    it("does not shrink children with flexShrink=0", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(100, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, flexShrink: 0 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 80, flexShrink: 1 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(80);
    });

    it("respects minWidth during shrink", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(100, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, flexShrink: 1, minWidth: 70 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 80, flexShrink: 1, minWidth: 70 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBeGreaterThanOrEqual(70);
      expect(c2.geometry[SLOT_WIDTH]).toBeGreaterThanOrEqual(70);
    });
  });

  describe("visibility and absolute filtering", () => {
    it("invisible children take no space", () => {
      const l = new StackLayout("horizontal", 10, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 60, visible: false });
      const c3 = makeChild({ sizingX: "fixed", preferredWidth: 40 });
      c.addChild(c1);
      c.addChild(c2);
      c.addChild(c3);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(0);
      expect(c3.geometry[SLOT_X]).toBe(90);
    });

    it("absolute children take no space in flow", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 60, absolute: true });
      const c3 = makeChild({ sizingX: "fixed", preferredWidth: 40 });
      c.addChild(c1);
      c.addChild(c2);
      c.addChild(c3);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(0);
      expect(c3.geometry[SLOT_X]).toBe(80);
    });
  });

  describe("padding on container", () => {
    it("layout respects container padding", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      c.setPaddingAll(10);
      const c1 = makeChild({ sizingX: "grow" });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(280);
      expect(c1.geometry[SLOT_HEIGHT]).toBe(80);
    });
  });

  describe("wrap layout", () => {
    it("wraps children to next line when they overflow", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch", true);
      const c = makeContainer(200, 200, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 120, sizingY: "fixed", preferredHeight: 40 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 120, sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_Y]).toBe(0);
      expect(c2.geometry[SLOT_Y]).toBe(40);
    });

    it("items that fit stay on same line", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch", true);
      const c = makeContainer(200, 200, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 40 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_Y]).toBe(0);
      expect(c2.geometry[SLOT_Y]).toBe(0);
      expect(c2.geometry[SLOT_X]).toBe(80);
    });

    it("applies runGap between wrapped lines", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch", true, 10);
      const c = makeContainer(100, 200, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 30 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 30 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c2.geometry[SLOT_Y]).toBe(40);
    });

    it("grow children expand within their wrap line", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch", true);
      const c = makeContainer(200, 200, l);
      const c1 = makeChild({ sizingX: "grow", sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_WIDTH]).toBe(200);
    });

    it("justify center works within wrap lines", () => {
      const l = new StackLayout("horizontal", 0, "center", "stretch", true);
      const c = makeContainer(200, 200, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 60, sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(70);
    });

    it("justify end works within wrap lines", () => {
      const l = new StackLayout("horizontal", 0, "end", "stretch", true);
      const c = makeContainer(200, 200, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 60, sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(140);
    });

    it("cross-axis alignment works within wrap lines", () => {
      const l = new StackLayout("horizontal", 0, "start", "center", true);
      const c = makeContainer(200, 200, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 20 });
      const c2 = makeChild({ sizingX: "fixed", preferredWidth: 80, sizingY: "fixed", preferredHeight: 40 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_Y]).toBe(10);
      expect(c2.geometry[SLOT_Y]).toBe(0);
      expect(c1.geometry[SLOT_HEIGHT]).toBe(20);
      expect(c2.geometry[SLOT_HEIGHT]).toBe(40);
    });
  });

  describe("vertical wrap", () => {
    it("wraps vertically", () => {
      const l = new StackLayout("vertical", 0, "start", "stretch", true);
      const c = makeContainer(200, 100, l);
      const c1 = makeChild({ sizingY: "fixed", preferredHeight: 70, sizingX: "fixed", preferredWidth: 50 });
      const c2 = makeChild({ sizingY: "fixed", preferredHeight: 70, sizingX: "fixed", preferredWidth: 50 });
      c.addChild(c1);
      c.addChild(c2);
      l.compute(c);
      expect(c1.geometry[SLOT_X]).toBe(0);
      expect(c2.geometry[SLOT_X]).toBe(50);
    });
  });

  describe("needsLayout propagation", () => {
    it("sets needsLayout on children after compute", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(300, 100, l);
      const c1 = makeChild({ sizingX: "fixed", preferredWidth: 80 });
      c1.needsLayout = false;
      c.addChild(c1);
      l.compute(c);
      expect(c1.needsLayout).toBe(true);
    });
  });

  describe("_sizes array growth", () => {
    it("handles more than 32 children without error", () => {
      const l = new StackLayout("horizontal", 0, "start", "stretch");
      const c = makeContainer(5000, 100, l);
      for (let i = 0; i < 50; i++) {
        c.addChild(makeChild({ sizingX: "fixed", preferredWidth: 10 }));
      }
      l.compute(c);
      expect(c.children[49].geometry[SLOT_X]).toBe(490);
    });
  });
});
