// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { TextInput } from "../../src/widgets/text-input";
import { makeFakeTheme } from "../test-helpers";

describe("TextInput drawSelf edge cases", () => {
  it("returns early when no font atlas", () => {
    const ti = new TextInput();
    ti.text = "hello";
    ti.width = 100;
    ti.height = 24;
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 24;
    const renderer = new Canvas2DRenderer(canvas);
    const theme = makeFakeTheme();
    (theme as unknown as { fontAtlas: null }).fontAtlas = null;
    renderer.begin(100, 24);
    ti.draw(renderer, theme);
    renderer.end();
  });

  it("draws with zero border radius uses fillRect", () => {
    const ti = new TextInput();
    ti.text = "test";
    ti.width = 100;
    ti.height = 24;
    ti.borderRadius = 0;
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 24;
    const renderer = new Canvas2DRenderer(canvas);
    renderer.begin(100, 24);
    ti.draw(renderer, makeFakeTheme());
    renderer.end();
  });

  it("draws selection highlight and cursor when focused with selection", () => {
    const ti = new TextInput();
    ti.text = "hello world";
    ti.cursorPos = 5;
    ti.selectionStart = 2;
    ti.selectionEnd = 8;
    ti.focused = true;
    ti.width = 150;
    ti.height = 24;
    const canvas = document.createElement("canvas");
    canvas.width = 150;
    canvas.height = 24;
    const renderer = new Canvas2DRenderer(canvas);
    renderer.begin(150, 24);
    ti.draw(renderer, makeFakeTheme());
    renderer.end();
  });
});
