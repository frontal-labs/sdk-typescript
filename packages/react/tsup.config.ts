import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  clean: true,
  external: ["react", "zod"],
  // Hooks are client-only in RSC frameworks.
  banner: { js: '"use client";' },
});
