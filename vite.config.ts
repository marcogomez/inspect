import { defineLibraryConfig, mergeConfig } from "@mgz-dev/viteforge";
import { defineConfig } from "vite";

export default defineConfig((env) => {
  const libraryConfig = defineLibraryConfig({
    name: "@mgz-dev/inspect",
    preset: "npm-full",
    rollupTypes: false,
    preserveModules: true,
    // emptying dist is for production builds only; the dev script runs watch with
    // --mode development, and a watch rebuild that wipes dist loses the declaration
    // files (the dts plugin does not re-emit unless a source file changed)
    alwaysEmptyOutDir: false,
    external: []
  });

  return mergeConfig(libraryConfig(env), {
    build: {
      lib: {
        entry: {
          index: "src/index.ts"
        }
      }
    }
  });
});
