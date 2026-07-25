import { createConfig } from "@mgz-dev/codestyle";

import { repoRules } from "./eslint.shared.mjs";

const config = createConfig()
  // The shared config wires eslint-plugin-jest's recommended rules onto test
  // files. This package uses Vitest (tests import from "vitest" explicitly), so
  // the jest plugin is both wrong and fatal here — `jest/no-deprecated-functions`
  // throws "Unable to detect Jest version". Drop that block; tests are then held
  // to the same general TypeScript + Prettier rules as the rest of the code.
  .filter((block) => !(block.plugins && block.plugins.jest))
  // The shared config globally ignores `**/test/`. We DO want our tests linted to
  // the same standard, so strip that one entry from the global-ignores block (a
  // global ignore can't be undone downstream, so we edit it here before export).
  .map((block) =>
    block.ignores && !block.files && !block.rules
      ? { ...block, ignores: block.ignores.filter((pattern) => pattern !== "**/test/") }
      : block
  );

// The base config uses type-aware linting with `project: true`, which resolves
// to tsconfig.json — and that only includes `src/**`. Point the test tree at
// tsconfig.test.json (which includes `test/**`) so the parser can type-check it.
// Tests are held to the SAME rule set as src — no relaxations.
config.push({
  files: ["test/**/*.ts", "test/**/*.tsx"],
  languageOptions: {
    parserOptions: {
      project: ["./tsconfig.test.json"],
      tsconfigRootDir: import.meta.dirname
    }
  }
});

export default [
  ...config,
  ...repoRules,
  {
    // DECLARED DEBT (API audit, section 12): inspect predates the documentation gate
    // and carries 475 undocumented members. the require-doc rule stays off here until
    // the dedicated documentation pass; every other repo rule applies in full.
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "aether/require-doc": "off" }
  }
];
