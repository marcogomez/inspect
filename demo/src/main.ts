// Demo entry. Wires the pieces together and owns the render loop:
//   1. CurlyLightScene  - the isolated three.js simulation
//   2. buildTabs        - the "surface of contact": params + scene setters
//   3. AmbientStats     - the perf monitor
import { Inspect } from "@mgz-dev/inspect";

import { buildTabs } from "./controls";
import { CurlyLightScene } from "./scene/curly-light";
import { AmbientStats } from "./stats";

import type { TabPageConfig } from "@mgz-dev/inspect";

/** clamp on a single frame's dt (e.g. after a tab-out), in seconds. */
const MAX_ELAPSED = 0.1;

const scene = new CurlyLightScene();

// perf monitor + frame-rate-cap state. The Performance tab's controls mutate
// `perfState`; the loop below reads it to cap the frame rate.
const perfState = { fpsTarget: 60, limitFps: false };
const stats = new AmbientStats();

const perfTab: TabPageConfig = {
  title: "PERFORMANCE",
  folders: [{ id: "perf", title: "Stats", expanded: true, controls: stats.controls(perfState) }]
};

Inspect.registerTabs([...buildTabs(scene), perfTab]);
Inspect.mount(document.body, {
  showToggleButton: true,
  toggleButtonSize: 25,
  initiallyVisible: true,
  toggleKey: "p"
});

// host-owned render loop with an accumulator-based fps cap
let lastFrameTimeMs = performance.now();
let fpsAccumulator = 0;

function doFrame(dt: number): void {
  const frameStart = performance.now();
  scene.renderFrame();
  // refresh the perf monitors only while the panel is visible
  if (Inspect.isVisible()) {
    stats.update(scene.getRenderInfo(), performance.now() - frameStart, dt);
    Inspect.update();
  }
}

function loop(): void {
  requestAnimationFrame(loop);

  const now = performance.now();
  const elapsedSeconds = Math.min((now - lastFrameTimeMs) / 1000, MAX_ELAPSED);
  lastFrameTimeMs = now;

  if (perfState.limitFps) {
    fpsAccumulator += elapsedSeconds;
    const fixedDt = 1 / perfState.fpsTarget;
    if (fpsAccumulator < fixedDt) {
      return;
    }
    fpsAccumulator -= fixedDt;
    if (fpsAccumulator > fixedDt) {
      fpsAccumulator = 0;
    }
    doFrame(fixedDt);
  } else {
    doFrame(elapsedSeconds);
  }
}

loop();
