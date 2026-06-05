import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", "**/*.d.ts"],
    testTimeout: 5000, hookTimeout: 5000, isolate: true,
    coverage: { provider: "v8", reporter: ["text", "json"], reportsDirectory: "../../coverage/packages/search", include: ["src/**/*.ts"], exclude: ["src/**/*.d.ts", "src/**/*.test.ts", "dist/**"], thresholds: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } } },
  },
  resolve: { alias: { "@": "./src" } },
});
