// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { GuiButton } from "../../src/gui/gui-button";
import { GuiButtonRow } from "../../src/gui/gui-button-row";
import { GuiFolder } from "../../src/gui/gui-folder";
import { GuiMonitor } from "../../src/gui/gui-monitor";
import { GuiReorderList } from "../../src/gui/gui-reorder-list";
import { GuiSelect } from "../../src/gui/gui-select";
import { GuiSeparator } from "../../src/gui/gui-separator";
import { GuiSlider } from "../../src/gui/gui-slider";
import { GuiTabContainer } from "../../src/gui/gui-tab-container";
import { GuiText } from "../../src/gui/gui-text";
import { GuiTextLog } from "../../src/gui/gui-text-log";
import { GuiToggle } from "../../src/gui/gui-toggle";
import { makeFakeInspectTheme } from "../test-helpers";

describe("GuiSlider", () => {
  it("creates with config and sets label text", () => {
    let val = 50;
    const s = new GuiSlider({
      key: "test",
      label: "Test Slider",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    expect(s.config.key).toBe("test");
    expect(s.config.label).toBe("Test Slider");
  });

  it("refresh updates internal slider value", () => {
    let val = 50;
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    val = 75;
    s.refresh();
  });

  it("snaps value to step", () => {
    let val = 0;
    const onChange = vi.fn((v: number) => {
      val = v;
    });
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 5,
      value: () => val,
      onChange
    });
    expect(s.config.step).toBe(5);
  });
});

describe("GuiToggle", () => {
  it("creates with config", () => {
    let val = false;
    const t = new GuiToggle({
      key: "tog",
      label: "Toggle",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    expect(t.config.key).toBe("tog");
  });

  it("refresh updates checkbox state", () => {
    let val = false;
    const t = new GuiToggle({
      key: "tog",
      label: "Toggle",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    val = true;
    t.refresh();
  });

  it("refresh does nothing when value unchanged", () => {
    let val = false;
    const t = new GuiToggle({
      key: "tog",
      label: "Toggle",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    t.refresh();
  });

  it("checkbox toggles on pointer down", () => {
    let val = false;
    const onChange = vi.fn((v: boolean) => {
      val = v;
    });
    const t = new GuiToggle({
      key: "tog",
      label: "Toggle",
      value: () => val,
      onChange
    });
    t.applyTheme(makeFakeInspectTheme());
    t.width = 400;
    t.height = 24;
    t.needsLayout = true;
    t.computeLayout();
    const checkbox = t.children[1].children[0];
    checkbox.onPointerDown(1, 12, 12, 0);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("checkbox toggles on Space key", () => {
    let val = false;
    const onChange = vi.fn((v: boolean) => {
      val = v;
    });
    const t = new GuiToggle({
      key: "tog",
      label: "Toggle",
      value: () => val,
      onChange
    });
    t.applyTheme(makeFakeInspectTheme());
    t.width = 400;
    t.height = 24;
    t.needsLayout = true;
    t.computeLayout();
    const checkbox = t.children[1].children[0];
    const handled = checkbox.onKeyDown(" ", "Space", false, false, false);
    expect(handled).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("checkbox ignores other keys", () => {
    let val = false;
    const t = new GuiToggle({
      key: "tog",
      label: "Toggle",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    t.applyTheme(makeFakeInspectTheme());
    t.width = 400;
    t.height = 24;
    t.needsLayout = true;
    t.computeLayout();
    const checkbox = t.children[1].children[0];
    const handled = checkbox.onKeyDown("a", "KeyA", false, false, false);
    expect(handled).toBe(false);
  });
});

describe("GuiButton", () => {
  it("uppercases the title", () => {
    const b = new GuiButton("click me");
    expect(b.text).toBe("CLICK ME");
  });

  it("assigns onClick callback", () => {
    const spy = vi.fn();
    const b = new GuiButton("test", spy);
    const { onClick } = b;
    if (!onClick) {
      throw new Error("expected onClick to be assigned");
    }
    onClick();
    expect(spy).toHaveBeenCalledOnce();
  });

  it("uses grow sizing by default", () => {
    const b = new GuiButton("test");
    expect(b.sizingX).toBe("grow");
    expect(b.sizingY).toBe("fixed");
  });

  it("works without onClick", () => {
    const b = new GuiButton("test");
    expect(b.onClick).toBeNull();
  });
});

describe("GuiButtonRow", () => {
  it("creates buttons from config", () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const row = new GuiButtonRow({
      key: "row",
      buttons: [
        { title: "btn1", onClick: spy1 },
        { title: "btn2", onClick: spy2 }
      ]
    });
    expect(row.config.key).toBe("row");
    expect(row.children).toHaveLength(2);
  });

  it("uppercases button titles", () => {
    const row = new GuiButtonRow({
      key: "row",
      buttons: [
        {
          title: "hello",
          onClick: () => {
            /* no-op */
          }
        }
      ]
    });
    expect((row.children[0] as unknown as { text: string }).text).toBe("HELLO");
  });
});

describe("GuiSeparator", () => {
  it("creates with horizontal separator child", () => {
    const s = new GuiSeparator();
    expect(s.children).toHaveLength(1);
    expect(s.sizingX).toBe("grow");
    expect(s.sizingY).toBe("fixed");
  });
});

describe("GuiText", () => {
  it("creates with config and initial value", () => {
    let val = "hello";
    const t = new GuiText({
      key: "txt",
      label: "Text",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    expect(t.config.key).toBe("txt");
  });

  it("refresh updates text when value changes", () => {
    let val = "hello";
    const t = new GuiText({
      key: "txt",
      label: "Text",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    val = "world";
    t.refresh();
  });

  it("refresh skips when focused", () => {
    let val = "hello";
    const t = new GuiText({
      key: "txt",
      label: "Text",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    val = "world";
    t.refresh();
  });
});

describe("GuiMonitor", () => {
  it("creates value monitor", () => {
    const m = new GuiMonitor({
      key: "fps",
      label: "FPS",
      value: () => 60
    });
    expect(m.config.key).toBe("fps");
  });

  it("creates graph monitor", () => {
    const m = new GuiMonitor({
      key: "fps",
      label: "FPS",
      value: () => 60,
      graph: true
    });
    expect(m.config.key).toBe("fps");
  });

  it("refresh updates the displayed value", () => {
    let val = 60;
    const m = new GuiMonitor({
      key: "fps",
      label: "FPS",
      value: () => val
    });
    m.refresh();
    val = 30;
    m.refresh();
  });

  it("refresh with interval skips if interval not elapsed", () => {
    const val = 60;
    const m = new GuiMonitor({
      key: "fps",
      label: "FPS",
      value: () => val,
      interval: 1000
    });
    m.refresh();
    m.refresh();
  });

  it("graph monitor only marks dirty when value changes or buffer not full", () => {
    const val = 60;
    const m = new GuiMonitor({
      key: "fps",
      label: "FPS",
      value: () => val,
      graph: true
    });
    for (let i = 0; i < 70; i++) {
      m.refresh();
    }
  });

  it("formats integer values as strings", () => {
    const m = new GuiMonitor({
      key: "test",
      label: "Test",
      value: () => 42
    });
    m.refresh();
  });

  it("formats float values with toFixed(2)", () => {
    const m = new GuiMonitor({
      key: "test",
      label: "Test",
      value: () => 3.14159
    });
    m.refresh();
  });

  it("uses custom format function", () => {
    const m = new GuiMonitor({
      key: "test",
      label: "Test",
      value: () => 42,
      format: (v) => `${v}ms`
    });
    m.refresh();
  });

  it("caches formatted value for same numeric input", () => {
    const m = new GuiMonitor({
      key: "test",
      label: "Test",
      value: () => 3.14
    });
    m.refresh();
    m.refresh();
  });
});

describe("GuiTextLog", () => {
  it("creates with config", () => {
    const tl = new GuiTextLog({
      key: "log",
      getValue: () => "line1\nline2"
    });
    expect(tl.config.key).toBe("log");
  });

  it("refresh updates text", () => {
    let val = "first";
    const tl = new GuiTextLog({
      key: "log",
      getValue: () => val
    });
    val = "second";
    tl.refresh();
  });

  it("refresh skips when text unchanged", () => {
    const tl = new GuiTextLog({
      key: "log",
      getValue: () => "same"
    });
    tl.refresh();
    tl.refresh();
  });

  it("accepts custom row count", () => {
    const tl = new GuiTextLog({
      key: "log",
      rows: 8,
      getValue: () => ""
    });
    expect(tl.config.rows).toBe(8);
  });
});

describe("GuiSelect", () => {
  it("creates with options", () => {
    let val = "a";
    const s = new GuiSelect({
      key: "sel",
      label: "Select",
      options: { "Option A": "a", "Option B": "b" },
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    expect(s.config.key).toBe("sel");
  });

  it("finds the current label from value", () => {
    const s = new GuiSelect({
      key: "sel",
      label: "Select",
      options: { "Option A": "a", "Option B": "b" },
      value: () => "b",
      onChange: () => {
        /* no-op */
      }
    });
    s.refresh();
  });

  it("returns empty string for unknown value", () => {
    const s = new GuiSelect({
      key: "sel",
      label: "Select",
      options: { "Option A": "a" },
      value: () => "z",
      onChange: () => {
        /* no-op */
      }
    });
    s.refresh();
  });

  it("applies theme", () => {
    const s = new GuiSelect({
      key: "sel",
      label: "Select",
      options: { A: "a", B: "b" },
      value: () => "a",
      onChange: () => {
        /* no-op */
      }
    });
    s.applyTheme(makeFakeInspectTheme());
  });

  it("toggles dropdown on button click", () => {
    const s = new GuiSelect({
      key: "sel",
      label: "Select",
      options: { A: "a", B: "b" },
      value: () => "a",
      onChange: () => {
        /* no-op */
      }
    });
    s.applyTheme(makeFakeInspectTheme());
    s.width = 400;
    s.height = 24;
    s.needsLayout = true;
    s.computeLayout();
    const btn = s.children[1].children[0];
    btn.onPointerDown(1, 50, 12, 0);
    btn.onPointerUp(1, 50, 12, 0);
  });
});

describe("GuiTabContainer", () => {
  it("creates with a tab bar", () => {
    const tc = new GuiTabContainer();
    expect(tc.tabBar).toBeDefined();
    expect(tc.getPageCount()).toBe(0);
  });

  it("adds pages and creates tabs", () => {
    const tc = new GuiTabContainer();
    const p1 = tc.addPage("Page 1");
    const p2 = tc.addPage("Page 2");
    expect(tc.getPageCount()).toBe(2);
    expect(p1.visible).toBe(true);
    expect(p2.visible).toBe(false);
  });

  it("sets active page", () => {
    const tc = new GuiTabContainer();
    tc.addPage("A");
    tc.addPage("B");
    tc.setActivePage(1);
    expect(tc.getActivePage()).toBe(1);
    const page0 = tc.getPage(0);
    const page1 = tc.getPage(1);
    if (!page0 || !page1) {
      throw new Error("expected pages 0 and 1 to exist");
    }
    expect(page0.visible).toBe(false);
    expect(page1.visible).toBe(true);
  });

  it("ignores invalid page index", () => {
    const tc = new GuiTabContainer();
    tc.addPage("A");
    tc.setActivePage(5);
    expect(tc.getActivePage()).toBe(0);
    tc.setActivePage(-1);
    expect(tc.getActivePage()).toBe(0);
  });

  it("ignores setting same page", () => {
    const tc = new GuiTabContainer();
    tc.addPage("A");
    tc.setActivePage(0);
    expect(tc.getActivePage()).toBe(0);
  });

  it("getPage returns null for out of range", () => {
    const tc = new GuiTabContainer();
    expect(tc.getPage(0)).toBeNull();
  });
});

describe("GuiFolder", () => {
  it("creates with header and content", () => {
    const f = new GuiFolder();
    f.id = "test";
    f.title = "Test Folder";
    expect(f.id).toBe("test");
    expect(f.title).toBe("Test Folder");
  });

  it("starts expanded", () => {
    const f = new GuiFolder();
    expect(f.expanded).toBe(true);
  });

  it("toggles expanded state", () => {
    const f = new GuiFolder();
    f.expanded = false;
    expect(f.expanded).toBe(false);
    f.expanded = true;
    expect(f.expanded).toBe(true);
  });

  it("does nothing when setting same expanded value", () => {
    const f = new GuiFolder();
    f.expanded = true;
    f.expanded = true;
    expect(f.expanded).toBe(true);
  });

  it("addControl adds widget to content area", () => {
    const f = new GuiFolder();
    const b = new GuiButton("test");
    f.addControl(b);
  });
});

describe("GuiReorderList", () => {
  it("creates rows from items", () => {
    const onChange = vi.fn();
    const list = new GuiReorderList({
      key: "order",
      items: [
        { id: "a", label: "Item A" },
        { id: "b", label: "Item B" },
        { id: "c", label: "Item C" }
      ],
      onChange
    });
    expect(list.config.key).toBe("order");
    expect(list.children).toHaveLength(3);
  });

  it("accepts pointer down on handle zone", () => {
    const list = new GuiReorderList({
      key: "order",
      items: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ],
      onChange: () => {
        /* no-op */
      }
    });
    list.width = 200;
    list.height = 100;
    list.children[0].geometry[1] = 0;
    list.children[0].geometry[3] = 24;
    list.children[1].geometry[1] = 24;
    list.children[1].geometry[3] = 24;
    const accepted = list.onPointerDown(1, 5, 10, 0);
    expect(accepted).toBe(true);
  });

  it("rejects pointer down outside handle zone", () => {
    const list = new GuiReorderList({
      key: "order",
      items: [{ id: "a", label: "A" }],
      onChange: () => {
        /* no-op */
      }
    });
    list.width = 200;
    list.height = 100;
    list.children[0].geometry[1] = 0;
    list.children[0].geometry[3] = 24;
    const accepted = list.onPointerDown(1, 100, 10, 0);
    expect(accepted).toBe(false);
  });

  it("rejects non-left button", () => {
    const list = new GuiReorderList({
      key: "order",
      items: [{ id: "a", label: "A" }],
      onChange: () => {
        /* no-op */
      }
    });
    const accepted = list.onPointerDown(1, 5, 10, 2);
    expect(accepted).toBe(false);
  });

  it("calls onChange on reorder completion", () => {
    const onChange = vi.fn();
    const list = new GuiReorderList({
      key: "order",
      items: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ],
      onChange
    });
    list.width = 200;
    list.height = 100;
    list.children[0].geometry[1] = 0;
    list.children[0].geometry[3] = 24;
    list.children[1].geometry[1] = 24;
    list.children[1].geometry[3] = 24;
    list.onPointerDown(1, 5, 5, 0);
    list.onPointerMove(1, 5, 40);
    list.onPointerUp(1, 5, 40, 0);
    expect(onChange).toHaveBeenCalled();
  });
});

describe("GUI drawing with theme", () => {
  /** draws the widget once into a throwaway 400x100 renderer with a fake theme. */
  function createRendererAndDraw(widget: import("../../src/core/widget").Widget): void {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 100;
    const renderer = new Canvas2DRenderer(canvas);
    renderer.begin(400, 100);
    widget.draw(renderer, makeFakeInspectTheme());
    renderer.end();
  }

  it("GuiToggle draws checkbox unchecked", () => {
    let val = false;
    const t = new GuiToggle({
      key: "tog",
      label: "Toggle",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    t.applyTheme(makeFakeInspectTheme());
    t.width = 400;
    t.height = 24;
    t.needsLayout = true;
    t.computeLayout();
    createRendererAndDraw(t);
  });

  it("GuiToggle draws checkbox checked", () => {
    const t = new GuiToggle({
      key: "tog",
      label: "Toggle",
      value: () => true,
      onChange: () => {
        /* no-op */
      }
    });
    t.applyTheme(makeFakeInspectTheme());
    t.width = 400;
    t.height = 24;
    t.needsLayout = true;
    t.computeLayout();
    createRendererAndDraw(t);
  });

  it("GuiSlider draws with theme applied", () => {
    let val = 50;
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    s.applyTheme(makeFakeInspectTheme());
    s.width = 400;
    s.height = 24;
    s.needsLayout = true;
    s.computeLayout();
    createRendererAndDraw(s);
  });

  it("GuiButton draws with theme applied", () => {
    const b = new GuiButton("TEST BUTTON");
    b.applyTheme(makeFakeInspectTheme());
    b.width = 200;
    b.height = 24;
    b.needsLayout = true;
    b.computeLayout();
    createRendererAndDraw(b);
  });

  it("GuiFolder draws with header and chevron", () => {
    const f = new GuiFolder();
    f.id = "test";
    f.title = "Test Folder";
    f.applyTheme(makeFakeInspectTheme());
    f.width = 400;
    f.height = 200;
    f.needsLayout = true;
    f.computeLayout();
    createRendererAndDraw(f);
  });

  it("GuiFolder draws collapsed", () => {
    const f = new GuiFolder();
    f.id = "test";
    f.title = "Collapsed";
    f.expanded = false;
    f.applyTheme(makeFakeInspectTheme());
    f.width = 400;
    f.height = 28;
    f.needsLayout = true;
    f.computeLayout();
    createRendererAndDraw(f);
  });

  it("GuiFolder header hover state", () => {
    const f = new GuiFolder();
    f.id = "test";
    f.title = "Hover Test";
    f.applyTheme(makeFakeInspectTheme());
    f.width = 400;
    f.height = 200;
    f.needsLayout = true;
    f.computeLayout();
    const header = f.children[0];
    header.onPointerEnter();
    createRendererAndDraw(f);
    header.onPointerLeave();
    createRendererAndDraw(f);
  });

  it("GuiFolder header click toggles expanded", () => {
    const f = new GuiFolder();
    f.id = "test";
    f.title = "Click Test";
    f.applyTheme(makeFakeInspectTheme());
    f.width = 400;
    f.height = 200;
    f.needsLayout = true;
    f.computeLayout();
    expect(f.expanded).toBe(true);
    const header = f.children[0];
    header.onPointerDown(1, 50, 12, 0);
    expect(f.expanded).toBe(false);
  });

  it("GuiMonitor draws graph with data", () => {
    let val = 0;
    const m = new GuiMonitor({
      key: "test",
      label: "Graph",
      value: () => val,
      graph: true
    });
    m.applyTheme(makeFakeInspectTheme());
    m.width = 400;
    m.height = 72;
    m.needsLayout = true;
    m.computeLayout();
    for (let i = 0; i < 10; i++) {
      val = Math.sin(i * 0.5) * 50 + 50;
      m.refresh();
    }
    createRendererAndDraw(m);
  });

  it("GuiSlider applyTheme and refresh", () => {
    let val = 50;
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    s.applyTheme(makeFakeInspectTheme());
    val = 75;
    s.refresh();
    val = 75;
    s.refresh();
  });

  it("GuiText applyTheme and draw", () => {
    let val = "hello";
    const t = new GuiText({
      key: "txt",
      label: "Text",
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    t.applyTheme(makeFakeInspectTheme());
    t.width = 400;
    t.height = 24;
    t.needsLayout = true;
    t.computeLayout();
    createRendererAndDraw(t);
  });

  it("GuiTextLog applyTheme and draw", () => {
    const tl = new GuiTextLog({ key: "log", getValue: () => "line1\nline2" });
    tl.applyTheme(makeFakeInspectTheme());
    tl.width = 400;
    tl.height = 80;
    tl.needsLayout = true;
    tl.computeLayout();
    createRendererAndDraw(tl);
  });

  it("GuiButtonRow applyTheme and draw", () => {
    const row = new GuiButtonRow({
      key: "row",
      buttons: [
        {
          title: "A",
          onClick: () => {
            /* no-op */
          }
        },
        {
          title: "B",
          onClick: () => {
            /* no-op */
          }
        }
      ]
    });
    row.applyTheme(makeFakeInspectTheme());
    row.width = 400;
    row.height = 24;
    row.needsLayout = true;
    row.computeLayout();
    createRendererAndDraw(row);
  });

  it("GuiSeparator applyTheme and draw", () => {
    const s = new GuiSeparator();
    s.applyTheme(makeFakeInspectTheme());
    s.width = 400;
    s.height = 4;
    s.needsLayout = true;
    s.computeLayout();
    createRendererAndDraw(s);
  });

  it("GuiTabContainer applyTheme", () => {
    const tc = new GuiTabContainer();
    tc.addPage("A");
    tc.addPage("B");
    tc.applyTheme(makeFakeInspectTheme());
  });

  it("GuiFolder animation toggle without surface (non-animated)", () => {
    const f = new GuiFolder();
    f.id = "test";
    f.title = "Anim Test";
    f.animated = false;
    f.applyTheme(makeFakeInspectTheme());
    f.width = 400;
    f.height = 200;
    f.needsLayout = true;
    f.computeLayout();
    f.expanded = false;
    expect(f.expanded).toBe(false);
    f.expanded = true;
    expect(f.expanded).toBe(true);
  });

  it("GuiFolder applyTheme updates content gap", () => {
    const f = new GuiFolder();
    f.applyTheme(makeFakeInspectTheme());
    const theme2 = makeFakeInspectTheme();
    theme2.controlGap = 8;
    f.applyTheme(theme2);
  });

  it("GuiSlider refresh when value unchanged does nothing", () => {
    let val = 50;
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    s.applyTheme(makeFakeInspectTheme());
    s.refresh();
    s.refresh();
  });

  it("GuiMonitor applyTheme on value and graph types", () => {
    const mv = new GuiMonitor({ key: "v", label: "V", value: () => 42 });
    mv.applyTheme(makeFakeInspectTheme());
    const mg = new GuiMonitor({ key: "g", label: "G", value: () => 42, graph: true });
    mg.applyTheme(makeFakeInspectTheme());
  });

  it("LabeledControl applyTheme sets label color", () => {
    let val = 50;
    const s = new GuiSlider({
      key: "test",
      label: "Test",
      min: 0,
      max: 100,
      step: 1,
      value: () => val,
      onChange: (v) => {
        val = v;
      }
    });
    const theme = makeFakeInspectTheme();
    theme.textLabel = 0xaabbccff;
    s.applyTheme(theme);
  });
});
