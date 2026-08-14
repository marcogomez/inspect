import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: ["test/**/*.test.ts"],
    // the first canvas-drawing test in a worker loads node-canvas's native
    // binding synchronously, which github's windows runners have stretched
    // past the 5 second default while defender scans the cold dll
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text"]
    },
    environment: "./test/vitest-environment-canvas.ts"
  },
});
