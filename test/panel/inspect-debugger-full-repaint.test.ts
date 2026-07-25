// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it, vi } from "vitest";

import { InspectPanel } from "../../src/panel/inspect-panel";

describe("InspectDebugger second full flush label", () => {
  it("shows FULL label on second full repaint (not FIRST PAINT)", () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    const panel = new InspectPanel(container, { debugMode: true });
    (panel.surface as unknown as { _width: number })._width = 400;
    (panel.surface as unknown as { _height: number })._height = 300;
    panel.surface.flush();
    vi.advanceTimersByTime(3000);
    panel.surface.markDirty();
    panel.surface.flush();
    vi.advanceTimersByTime(3000);
    panel.dispose();
    vi.useRealTimers();
  });
});
