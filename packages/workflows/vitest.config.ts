import { defineConfig } from "vitest/config";
import { resolveAliases } from "../../vitest.preset";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts",
    ],
    exclude: ["node_modules", "dist", "**/*.d.ts"],
    testTimeout: 5000,
    hookTimeout: 5000,
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      reportsDirectory: "../../coverage/packages/workflows",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "dist/**",
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
  },
  resolve: {
    alias: resolveAliases,
  },
});
