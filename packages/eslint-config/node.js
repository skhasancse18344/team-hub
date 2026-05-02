import { config as baseConfig } from "./base.js";

/**
 * ESLint configuration for Node.js / Express apps.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nodeConfig = [
  ...baseConfig,
  {
    rules: {
      "no-console": "warn",
    },
  },
  {
    ignores: ["dist/**"],
  },
];
