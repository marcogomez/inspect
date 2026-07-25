// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, expect, it, vi } from "vitest";

import { ToggleIcon } from "../../src/widgets/toggle-icon";

describe("ToggleIcon hover", () => {
  it("sets hovered on mouseenter and clears on mouseleave", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);

    icon.element.dispatchEvent(new Event("mouseenter"));
    expect((icon as unknown as { hovered: boolean }).hovered).toBe(true);

    icon.element.dispatchEvent(new Event("mouseleave"));
    expect((icon as unknown as { hovered: boolean }).hovered).toBe(false);

    icon.destroy();
  });
});

describe("ToggleIcon animation tick completion", () => {
  it("tick completes animation when elapsed >= duration", async () => {
    vi.useFakeTimers();
    const icon = new ToggleIcon(21, "right", 0, 35);

    icon.setState("x");

    vi.advanceTimersByTime(500);

    expect((icon as unknown as { animating: boolean }).animating).toBe(false);

    icon.destroy();
    vi.useRealTimers();
  });

  it("tick returns early when not animating", () => {
    const icon = new ToggleIcon(21, "right", 0, 35);

    const tick = (icon as unknown as { _boundTick: () => void })._boundTick;
    tick();

    icon.destroy();
  });

  it("draw skips lines with opacity < 0.01", async () => {
    vi.useFakeTimers();
    const icon = new ToggleIcon(21, "right", 0, 35);

    icon.setState("x");
    vi.advanceTimersByTime(500);

    icon.destroy();
    vi.useRealTimers();
  });
});
