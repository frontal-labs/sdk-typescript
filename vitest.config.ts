import { defineConfig } from "vitest/config";
import { resolveAliases } from "./vitest.preset";

const src = (name: string) => resolveAliases[`@frontal-labs/${name}`];

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./packages/testing/src/setup.ts"],
    include: [
      "packages/**/*.{test,spec}.{ts,tsx,js,jsx}",
      "tests/**/*.{test,spec}.{ts,tsx,js,jsx}",
    ],
    exclude: [
      "node_modules",
      "dist",
      "coverage",
      "**/*.d.ts",
      "packages/**/node_modules/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage",
      include: [
        "packages/**/*.ts",
        "packages/**/*.tsx",
        "packages/**/*.js",
        "packages/**/*.jsx",
      ],
      exclude: [
        "packages/**/*.d.ts",
        "packages/**/*.test.{ts,tsx,js,jsx}",
        "packages/**/*.spec.{ts,tsx,js,jsx}",
        "packages/**/dist/**",
        "packages/**/node_modules/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    watch: false,
    isolate: true,
    reporters: ["default", "junit"],
    outputFile: {
      junit: "test-results/junit.xml",
    },
  },
  resolve: {
    alias: resolveAliases,
  },
  define: {
    "process.env.NODE_ENV": '"test"',
  },
});
