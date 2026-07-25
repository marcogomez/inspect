import { describe, expect, it } from "vitest";

describe("canvas environment", () => {
  it("creates a 2d context", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("expected a 2d context");
    }
    expect(typeof ctx.fillRect).toBe("function");
  });

  it("draws and reads fillStyle", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2d context unavailable");
    }
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 50, 50);
    expect(ctx.fillStyle).toBe("#ff0000");
  });
});
