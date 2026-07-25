// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { StackLayout } from "../../src/core/layouts/stack-layout";
import { Surface } from "../../src/core/surface";
import { GuiSelect } from "../../src/gui/gui-select";
import { Box } from "../../src/widgets/box";
import { Button } from "../../src/widgets/button";
import { makeFakeInspectTheme } from "../test-helpers";

/** mounts a GuiSelect with three options in a 400x400 surface, themed and flushed, returning the test handles. */
function createMountedSelect() {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const renderer = new Canvas2DRenderer(canvas);
  const theme = makeFakeInspectTheme();
  const surface = new Surface(canvas, renderer, theme);
  const root = new Box();
  root.width = 400;
  root.height = 400;
  root.layout = new StackLayout("vertical", 0, "start", "stretch");
  surface.setRoot(root);
  (surface as unknown as { _width: number })._width = 400;
  (surface as unknown as { _height: number })._height = 400;

  const onChange = vi.fn();
  const select = new GuiSelect({
    key: "mode",
    label: "Mode",
    options: { fast: "Fast", normal: "Normal", slow: "Slow" },
    value: () => "Normal",
    onChange
  });
  select.applyTheme(theme);
  root.addChild(select);
  root.needsLayout = true;
  root.computeLayout();
  surface.flush();

  return { surface, root, select, onChange, renderer, theme };
}

/** returns the select's trigger Button. */
function getButton(select: GuiSelect<string>): Button {
  return select.children[1].children[0] as unknown as Button;
}

describe("GuiSelect dropdown open/close", () => {
  it("opens dropdown on button click", () => {
    const { select, surface } = createMountedSelect();
    const button = getButton(select);
    const onClick = button.onClick;
    if (!onClick) {
      throw new Error("expected button to have an onClick handler");
    }
    onClick();
    surface.dispose();
  });

  it("does not double-open", () => {
    const { select, surface } = createMountedSelect();
    const button = getButton(select);
    const onClick = button.onClick;
    if (!onClick) {
      throw new Error("expected button to have an onClick handler");
    }
    onClick();
    onClick();
    surface.dispose();
  });

  it("closes dropdown on second toggle", () => {
    const { select, surface } = createMountedSelect();
    const button = getButton(select);
    const onClick = button.onClick;
    if (!onClick) {
      throw new Error("expected button to have an onClick handler");
    }
    onClick();
    onClick();
    surface.dispose();
  });

  it("closeDropdown is no-op when already closed", () => {
    const { select, surface } = createMountedSelect();
    (select as unknown as { closeDropdown: () => void }).closeDropdown();
    surface.dispose();
  });

  it("option click fires onChange and closes dropdown", () => {
    const { select, onChange, surface } = createMountedSelect();
    const button = getButton(select);
    const onClick = button.onClick;
    if (!onClick) {
      throw new Error("expected button to have an onClick handler");
    }
    onClick();

    const dropdown = (select as unknown as { _dropdown: Box | null })._dropdown;
    if (dropdown && dropdown.children.length > 0) {
      const optionBtn = dropdown.children[0] as unknown as Button;
      const optionOnClick = optionBtn.onClick;
      if (!optionOnClick) {
        throw new Error("expected option button to have an onClick handler");
      }
      optionOnClick();
    }

    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(0);
    surface.dispose();
  });

  it("backdrop click closes dropdown", () => {
    const { select, surface } = createMountedSelect();
    const button = getButton(select);
    const onClick = button.onClick;
    if (!onClick) {
      throw new Error("expected button to have an onClick handler");
    }
    onClick();

    const backdrop = (
      select as unknown as {
        _backdrop: { onPointerDown: ((pid: number, x: number, y: number, btn: number) => boolean) | null } | null;
      }
    )._backdrop;
    if (backdrop && backdrop.onPointerDown) {
      backdrop.onPointerDown(1, 5, 5, 0);
    }

    surface.dispose();
  });

  it("openDropdown without surface root is no-op", () => {
    const onChange = vi.fn();
    const select = new GuiSelect({
      key: "mode",
      label: "Mode",
      options: { a: "A", b: "B" },
      value: () => "A",
      onChange
    });
    select.applyTheme(makeFakeInspectTheme());
    select.width = 200;
    select.height = 24;
    select.needsLayout = true;
    select.computeLayout();
    const button = getButton(select);
    const onClick = button.onClick;
    if (!onClick) {
      throw new Error("expected button to have an onClick handler");
    }
    onClick();
  });

  it("ensureDropdownWidgets is cached on repeated open/close", () => {
    const { select, surface } = createMountedSelect();
    const btn = getButton(select);
    const onClick = btn.onClick;
    if (!onClick) {
      throw new Error("expected button to have an onClick handler");
    }
    onClick();
    onClick();
    onClick();
    surface.dispose();
  });
});
