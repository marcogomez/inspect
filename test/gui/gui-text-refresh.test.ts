// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { GuiText } from "../../src/gui/gui-text";
import { TextInput } from "../../src/widgets/text-input";
import { makeFakeInspectTheme } from "../test-helpers";

/** returns the TextInput nested inside the GuiText control. */
function getInput(gt: GuiText): TextInput {
  return gt.children[1].children[0] as unknown as TextInput;
}

describe("GuiText", () => {
  it("onChange fires when text input changes", () => {
    const onChange = vi.fn();
    const gt = new GuiText({
      key: "name",
      label: "Name",
      value: () => "hello",
      onChange
    });
    gt.applyTheme(makeFakeInspectTheme());
    gt.width = 300;
    gt.height = 24;
    gt.needsLayout = true;
    gt.computeLayout();

    const input = getInput(gt);
    const handler = input.onChange;
    if (!handler) {
      throw new Error("expected text input to have an onChange handler");
    }
    handler("world");
    expect(onChange).toHaveBeenCalledWith("world");
  });

  it("refresh skips when input is focused", () => {
    const gt = new GuiText({
      key: "name",
      label: "Name",
      value: () => "hello",
      onChange: () => {
        /* no-op */
      }
    });
    gt.applyTheme(makeFakeInspectTheme());
    gt.width = 300;
    gt.height = 24;
    gt.needsLayout = true;
    gt.computeLayout();

    const input = getInput(gt);
    input.focused = true;
    gt.refresh();
  });

  it("refresh skips when value unchanged", () => {
    const gt = new GuiText({
      key: "name",
      label: "Name",
      value: () => "hello",
      onChange: () => {
        /* no-op */
      }
    });
    gt.applyTheme(makeFakeInspectTheme());
    gt.width = 300;
    gt.height = 24;
    gt.needsLayout = true;
    gt.computeLayout();

    gt.refresh();
  });

  it("refresh updates text when value changes", () => {
    let val = "hello";
    const gt = new GuiText({
      key: "name",
      label: "Name",
      value: () => val,
      onChange: () => {
        /* no-op */
      }
    });
    gt.applyTheme(makeFakeInspectTheme());
    gt.width = 300;
    gt.height = 24;
    gt.needsLayout = true;
    gt.computeLayout();

    val = "world";
    gt.refresh();

    const input = getInput(gt);
    expect(input.text).toBe("world");
  });

  it("config getter returns the config", () => {
    const config = {
      key: "name",
      label: "Name",
      value: () => "test",
      onChange: () => {
        /* no-op */
      }
    };
    const gt = new GuiText(config);
    expect(gt.config).toBe(config);
  });
});
