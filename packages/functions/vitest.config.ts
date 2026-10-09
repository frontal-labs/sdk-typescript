import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "bun",
    include: ["src/**/*.test.ts"],
  },
});