import { CanvasAdapter } from "@happy-dom/node-canvas-adapter";
import { GlobalWindow, Window } from "happy-dom";
import { populateGlobal } from "vitest/environments";

import type { Environment } from "vitest/environments";

/**
 * tears down a happy-dom window. prefers the async abort path when available so
 * pending timers and fetches are cancelled before close; otherwise falls back to
 * the synchronous cancelAsync.
 */
async function teardownWindow(win: InstanceType<typeof Window>): Promise<void> {
  if (win.happyDOM.abort) {
    await win.happyDOM.abort();
    win.close();
  } else {
    win.happyDOM.cancelAsync();
  }
}

/**
 * vitest environment that runs tests against a happy-dom window wired to the
 * node canvas adapter, so canvas 2d contexts work under the "canvas" project.
 * document.fonts is stubbed when missing so font-atlas loading resolves.
 */
const environment: Environment = {
  name: "happy-dom-canvas",
  transformMode: "web",

  async setup(global, { happyDOM = {} } = {}) {
    const WindowImpl = GlobalWindow || Window;
    const win = new WindowImpl({
      ...happyDOM,
      console: global.console ?? globalThis.console,
      url: happyDOM.url || "http://localhost:3000",
      settings: {
        ...happyDOM.settings,
        disableErrorCapturing: true,
        canvasAdapter: new CanvasAdapter()
      }
    });

    if (!(win as unknown as { document: { fonts?: unknown } }).document.fonts) {
      (win as unknown as { document: { fonts: unknown } }).document.fonts = {
        ready: Promise.resolve()
      };
    }

    const { keys, originals } = populateGlobal(global, win, {
      bindFunctions: true,
      additionalKeys: ["Request", "Response", "MessagePort", "fetch"]
    });

    return {
      async teardown() {
        await teardownWindow(win as unknown as InstanceType<typeof Window>);
        keys.forEach((key: string) => delete global[key]);
        originals.forEach((v: unknown, k: string | symbol) => {
          global[k] = v;
        });
      }
    };
  }
};

export default environment;
