// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it } from "vitest";

import { ToggleIcon } from "../../src/widgets/toggle-icon";

describe("ToggleIcon", () => {
  it("creates a canvas element", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    expect(icon.element).toBeInstanceOf(HTMLCanvasElement);
    expect(icon.element.style.position).toBe("fixed");
    expect(icon.element.style.cursor).toBe("pointer");
    icon.destroy();
  });

  it("creates with correct size", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    expect(icon.element.style.width).toBe("21px");
    expect(icon.element.style.height).toBe("21px");
    icon.destroy();
  });

  it("positions on the right side", () => {
    const icon = new ToggleIcon(21, "right", 10, 35);
    expect(icon.element.style.right).toBe("18px");
    icon.destroy();
  });

  it("positions on the left side", () => {
    const icon = new ToggleIcon(21, "left", 10, 35);
    expect(icon.element.style.left).toBe("18px");
    icon.destroy();
  });

  it("starts in hamburger state", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    icon.destroy();
  });

  it("transitions to X state", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    icon.setState("x");
    icon.destroy();
  });

  it("transitions back to hamburger", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    icon.setState("x");
    icon.setState("hamburger");
    icon.destroy();
  });

  it("does nothing when setting same state", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    icon.setState("hamburger");
    icon.destroy();
  });

  it("fires onClick when element is clicked", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    let clicked = false;
    icon.onClick = () => {
      clicked = true;
    };
    icon.element.click();
    expect(clicked).toBe(true);
    icon.destroy();
  });

  it("does not fire onClick when no handler", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    icon.element.click();
    icon.destroy();
  });

  it("destroy removes the element and cancels animation", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);
    const parent = document.createElement("div");
    parent.appendChild(icon.element);
    expect(parent.children).toHaveLength(1);
    icon.destroy();
    expect(parent.children).toHaveLength(0);
  });
});
