// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { TextInput } from "../../src/widgets/text-input";
import { makeFakeTheme } from "../test-helpers";

/** draws the text input once onto a throwaway 200x30 canvas to exercise the draw path. */
function drawInput(input: TextInput): void {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 30;
  const renderer = new Canvas2DRenderer(canvas);
  renderer.begin(200, 30);
  input.draw(renderer, makeFakeTheme());
  renderer.end();
}

describe("TextInput selection and delete", () => {
  it("Delete key removes selected text", () => {
    const onChange = vi.fn();
    const ti = new TextInput();
    ti.text = "hello world";
    ti.cursorPos = 5;
    ti.selectionStart = 0;
    ti.selectionEnd = 5;
    ti.onChange = onChange;
    ti.onKeyDown("Delete", "Delete", false, false, false);
    expect(ti.text).toBe(" world");
    expect(onChange).toHaveBeenCalledWith(" world");
  });

  it("Delete key removes char at cursor when no selection", () => {
    const onChange = vi.fn();
    const ti = new TextInput();
    ti.text = "abc";
    ti.cursorPos = 1;
    ti.onChange = onChange;
    ti.onKeyDown("Delete", "Delete", false, false, false);
    expect(ti.text).toBe("ac");
    expect(onChange).toHaveBeenCalledWith("ac");
  });

  it("Backspace removes selected text", () => {
    const onChange = vi.fn();
    const ti = new TextInput();
    ti.text = "hello world";
    ti.cursorPos = 11;
    ti.selectionStart = 5;
    ti.selectionEnd = 11;
    ti.onChange = onChange;
    ti.onKeyDown("Backspace", "Backspace", false, false, false);
    expect(ti.text).toBe("hello");
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("typing replaces selected text", () => {
    const onChange = vi.fn();
    const ti = new TextInput();
    ti.text = "hello";
    ti.cursorPos = 5;
    ti.selectionStart = 0;
    ti.selectionEnd = 5;
    ti.onChange = onChange;
    ti.onKeyDown("X", "KeyX", false, false, false);
    expect(ti.text).toBe("X");
    expect(onChange).toHaveBeenCalledWith("X");
  });
});

describe("TextInput drawing states", () => {
  it("draws with zero border radius", () => {
    const ti = new TextInput();
    ti.text = "test";
    ti.width = 100;
    ti.height = 24;
    ti.borderRadius = 0;
    drawInput(ti);
  });

  it("draws with placeholder when empty and not focused", () => {
    const ti = new TextInput();
    ti.text = "";
    ti.placeholder = "Type here...";
    ti.width = 100;
    ti.height = 24;
    drawInput(ti);
  });

  it("draws selection highlight", () => {
    const ti = new TextInput();
    ti.text = "hello world";
    ti.cursorPos = 5;
    ti.selectionStart = 0;
    ti.selectionEnd = 5;
    ti.focused = true;
    ti.width = 150;
    ti.height = 24;
    drawInput(ti);
  });

  it("draws cursor when focused", () => {
    const ti = new TextInput();
    ti.text = "abc";
    ti.cursorPos = 2;
    ti.focused = true;
    ti.width = 100;
    ti.height = 24;
    drawInput(ti);
  });

  it("draws with text offset when cursor near end", () => {
    const ti = new TextInput();
    ti.text = "a very long text that does not fit in the small area";
    ti.cursorPos = ti.text.length;
    ti.focused = true;
    ti.width = 80;
    ti.height = 24;
    drawInput(ti);
  });
});

describe("TextInput deleteSelection no-op", () => {
  it("does nothing when no selection is active", () => {
    const ti = new TextInput();
    ti.text = "hello";
    ti.cursorPos = 3;
    ti.selectionStart = -1;
    ti.selectionEnd = -1;
    (ti as unknown as { deleteSelection: () => void }).deleteSelection();
    expect(ti.text).toBe("hello");
  });
});
