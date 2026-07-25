import { describe, expect, it, vi } from "vitest";

import { TextInput } from "../../src/widgets/text-input";

describe("TextInput", () => {
  describe("defaults", () => {
    it("starts focusable", () => {
      const t = new TextInput();
      expect(t.focusable).toBe(true);
    });

    it("starts with empty text and cursor at 0", () => {
      const t = new TextInput();
      expect(t.text).toBe("");
      expect(t.cursorPos).toBe(0);
    });

    it("starts with no selection", () => {
      const t = new TextInput();
      expect(t.selectionStart).toBe(-1);
      expect(t.selectionEnd).toBe(-1);
    });

    it("starts with no onChange", () => {
      const t = new TextInput();
      expect(t.onChange).toBeNull();
    });
  });

  describe("character insertion", () => {
    it("inserts a character at cursor position", () => {
      const t = new TextInput();
      t.text = "helo";
      t.cursorPos = 3;
      t.onKeyDown("l", "KeyL", false, false, false);
      expect(t.text).toBe("hello");
      expect(t.cursorPos).toBe(4);
    });

    it("fires onChange on character insert", () => {
      const t = new TextInput();
      const changeSpy = vi.fn();
      t.onChange = changeSpy;
      t.onKeyDown("a", "KeyA", false, false, false);
      expect(changeSpy).toHaveBeenCalledWith("a");
    });

    it("inserts at the beginning", () => {
      const t = new TextInput();
      t.text = "ello";
      t.cursorPos = 0;
      t.onKeyDown("h", "KeyH", false, false, false);
      expect(t.text).toBe("hello");
      expect(t.cursorPos).toBe(1);
    });

    it("replaces selection on character insert", () => {
      const t = new TextInput();
      t.text = "hello";
      t.selectionStart = 1;
      t.selectionEnd = 4;
      t.cursorPos = 1;
      t.onKeyDown("a", "KeyA", false, false, false);
      expect(t.text).toBe("hao");
      expect(t.cursorPos).toBe(2);
    });

    it("ignores character input when disabled", () => {
      const t = new TextInput();
      t.enabled = false;
      t.onKeyDown("a", "KeyA", false, false, false);
      expect(t.text).toBe("");
    });

    it("ignores ctrl+key (except ctrl+a)", () => {
      const t = new TextInput();
      const handled = t.onKeyDown("c", "KeyC", true, false, false);
      expect(handled).toBe(false);
    });
  });

  describe("backspace", () => {
    it("deletes character before cursor", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 5;
      t.onKeyDown("Backspace", "Backspace", false, false, false);
      expect(t.text).toBe("hell");
      expect(t.cursorPos).toBe(4);
    });

    it("does nothing at start of text", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 0;
      t.onKeyDown("Backspace", "Backspace", false, false, false);
      expect(t.text).toBe("hello");
      expect(t.cursorPos).toBe(0);
    });

    it("deletes selection on backspace", () => {
      const t = new TextInput();
      t.text = "hello";
      t.selectionStart = 1;
      t.selectionEnd = 3;
      t.cursorPos = 3;
      t.onKeyDown("Backspace", "Backspace", false, false, false);
      expect(t.text).toBe("hlo");
      expect(t.cursorPos).toBe(1);
    });

    it("fires onChange on backspace", () => {
      const t = new TextInput();
      t.text = "ab";
      t.cursorPos = 2;
      const changeSpy = vi.fn();
      t.onChange = changeSpy;
      t.onKeyDown("Backspace", "Backspace", false, false, false);
      expect(changeSpy).toHaveBeenCalledWith("a");
    });
  });

  describe("delete", () => {
    it("deletes character after cursor", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 0;
      t.onKeyDown("Delete", "Delete", false, false, false);
      expect(t.text).toBe("ello");
      expect(t.cursorPos).toBe(0);
    });

    it("does nothing at end of text", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 5;
      t.onKeyDown("Delete", "Delete", false, false, false);
      expect(t.text).toBe("hello");
    });

    it("deletes selection on delete key", () => {
      const t = new TextInput();
      t.text = "hello";
      t.selectionStart = 2;
      t.selectionEnd = 4;
      t.cursorPos = 4;
      t.onKeyDown("Delete", "Delete", false, false, false);
      expect(t.text).toBe("heo");
      expect(t.cursorPos).toBe(2);
    });
  });

  describe("arrow keys", () => {
    it("ArrowLeft moves cursor left", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 3;
      t.onKeyDown("ArrowLeft", "ArrowLeft", false, false, false);
      expect(t.cursorPos).toBe(2);
    });

    it("ArrowLeft stops at 0", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 0;
      t.onKeyDown("ArrowLeft", "ArrowLeft", false, false, false);
      expect(t.cursorPos).toBe(0);
    });

    it("ArrowRight moves cursor right", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 3;
      t.onKeyDown("ArrowRight", "ArrowRight", false, false, false);
      expect(t.cursorPos).toBe(4);
    });

    it("ArrowRight stops at text length", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 5;
      t.onKeyDown("ArrowRight", "ArrowRight", false, false, false);
      expect(t.cursorPos).toBe(5);
    });

    it("Arrow keys clear selection", () => {
      const t = new TextInput();
      t.text = "hello";
      t.selectionStart = 1;
      t.selectionEnd = 4;
      t.cursorPos = 4;
      t.onKeyDown("ArrowLeft", "ArrowLeft", false, false, false);
      expect(t.selectionStart).toBe(-1);
      expect(t.selectionEnd).toBe(-1);
    });
  });

  describe("Home / End", () => {
    it("Home moves cursor to start", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 3;
      t.onKeyDown("Home", "Home", false, false, false);
      expect(t.cursorPos).toBe(0);
    });

    it("End moves cursor to end", () => {
      const t = new TextInput();
      t.text = "hello";
      t.cursorPos = 0;
      t.onKeyDown("End", "End", false, false, false);
      expect(t.cursorPos).toBe(5);
    });

    it("Home/End clear selection", () => {
      const t = new TextInput();
      t.text = "hello";
      t.selectionStart = 1;
      t.selectionEnd = 3;
      t.onKeyDown("Home", "Home", false, false, false);
      expect(t.selectionStart).toBe(-1);
    });
  });

  describe("select all (Ctrl+A)", () => {
    it("selects all text", () => {
      const t = new TextInput();
      t.text = "hello";
      t.onKeyDown("a", "KeyA", true, false, false);
      expect(t.selectionStart).toBe(0);
      expect(t.selectionEnd).toBe(5);
    });
  });

  describe("focus / blur", () => {
    it("onFocus makes cursor visible", () => {
      const t = new TextInput();
      t.onFocus();
    });

    it("onBlur clears selection", () => {
      const t = new TextInput();
      t.text = "hello";
      t.selectionStart = 1;
      t.selectionEnd = 3;
      t.onBlur();
      expect(t.selectionStart).toBe(-1);
      expect(t.selectionEnd).toBe(-1);
    });
  });

  describe("pointer down", () => {
    it("accepts left click", () => {
      const t = new TextInput();
      t.width = 100;
      t.height = 24;
      const accepted = t.onPointerDown(1, 50, 12, 0);
      expect(accepted).toBe(true);
    });

    it("rejects non-left click", () => {
      const t = new TextInput();
      t.width = 100;
      t.height = 24;
      const accepted = t.onPointerDown(1, 50, 12, 2);
      expect(accepted).toBe(false);
    });
  });

  describe("unhandled keys", () => {
    it("returns false for unrecognized keys", () => {
      const t = new TextInput();
      const handled = t.onKeyDown("F1", "F1", false, false, false);
      expect(handled).toBe(false);
    });

    it("returns false for ctrl+key combos (except a)", () => {
      const t = new TextInput();
      const handled = t.onKeyDown("z", "KeyZ", true, false, false);
      expect(handled).toBe(false);
    });
  });
});
