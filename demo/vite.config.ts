import { resolve } from "node:path";

import { defineAppConfig, mergeConfig } from "@mgz-dev/viteforge";
import { defineConfig } from "vite";

// SPA demo, built with viteforge's app preset (single-file self-contained HTML
// in build mode). The demo imports the library straight from source so it gets
// HMR and always reflects the current code.
export default defineConfig((env) => {
  const appConfig = defineAppConfig({ port: 10720, previewPort: 10721 });

  return mergeConfig(appConfig(env), {
    base: "/inspect/",
    resolve: {
      alias: {
        "@mgz-dev/inspect": resolve(import.meta.dirname, "../src/index.ts")
      }
    }
  });
});
