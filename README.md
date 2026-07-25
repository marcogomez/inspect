# @mgz-dev/inspect

A GUI panel for games and dev tools (sliders, toggles, colors, selects, monitors, and more), drawn
entirely to a single `<canvas>`.

The panel brings its own dirty-rect compositor, layout engine, font atlas and input dispatcher, so
it builds no DOM widget tree and injects no stylesheets. That keeps it out of the browser's style,
layout and paint pipeline, which is the part that competes with a render loop for main-thread time.
It has no runtime dependencies.

The panel is one fixed-position canvas element. Two small exceptions are worth knowing about: a
transient DOM `<input>` is created while a numeric or text value is being edited, and the optional
toggle button is a second, small canvas.

## Install

```sh
pnpm add @mgz-dev/inspect
```

## Quick Start

```ts
import { Inspect, slider, toggle, color } from "@mgz-dev/inspect";

const state = { speed: 0.17, enabled: true, tint: { r: 1, g: 1, b: 1 } };
const render = () => {
  /* redraw your scene with the new state */
};

Inspect.registerTabs([
  {
    title: "SETTINGS",
    folders: [
      {
        id: "demo",
        title: "Demo",
        expanded: true,
        controls: [
          slider.of(state, "speed", { min: 0, max: 1, step: 0.01 }, () => render()),
          toggle.of(state, "enabled", {}, () => render()),
          color.of(state, "tint", { colorType: "float" }, () => render())
        ]
      }
    ]
  }
]);

Inspect.mount(document.body, { position: "right", toggleKey: "p" });
```

Call `Inspect.update()` once per frame from your render loop to refresh monitors and live readouts.
Guarding it with `Inspect.isVisible()` skips the work while the panel is hidden:

```ts
function frame() {
  requestAnimationFrame(frame);
  drawScene();
  if (Inspect.isVisible()) {
    Inspect.update();
  }
}
```

## Widget toolkit

The same entry point also exports the primitives the panel is built from, for custom controls:

```ts
import { Widget, Box, Label, Button, Slider, StackLayout, CanvasWidget, THEME_DEFAULT } from "@mgz-dev/inspect";
```

## Notes

Because the panel is painted rather than composed from elements, it is not exposed to assistive
technology: screen readers cannot read it, its values cannot be selected or copied, and the host
page cannot restyle it with CSS. For a debug and tuning overlay that is usually the right trade,
but it is worth knowing before reaching for it as general application UI.
