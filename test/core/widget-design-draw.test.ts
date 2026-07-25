// @vitest-environment ./test/canvas/vitest-environment-canvas.ts
import { describe, it } from "vitest";

import { Canvas2DRenderer } from "../../src/core/canvas2d-renderer";
import { Surface } from "../../src/core/surface";
import { Widget } from "../../src/core/widget";
import { Box } from "../../src/widgets/box";
import { makeFakeTheme } from "../test-helpers";

describe("Widget drawChildren with designWidth sub-pixel snap", () => {
  it("renders children with design scale < 1 using binary snap", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    const renderer = new Canvas2DRenderer(canvas);
    const theme = makeFakeTheme();
    const surface = new Surface(canvas, renderer, theme);
    (surface as unknown as { _width: number })._width = 400;
    (surface as unknown as { _height: number })._height = 300;

    const root = new Box();
    root.width = 400;
    root.height = 300;
    surface.setRoot(root);

    const w = new Widget();
    w.designWidth = 800;
    w.designHeight = 600;
    w.preferredWidth = 200;
    w.preferredHeight = 150;
    root.addChild(w);

    const child = new Widget();
    child.preferredWidth = 100;
    child.preferredHeight = 50;
    w.addChild(child);

    root.needsLayout = true;
    root.computeLayout();
    surface.flush();

    renderer.begin(400, 300);
    w.draw(renderer, theme);
    renderer.end();

    surface.dispose();
  });
});
