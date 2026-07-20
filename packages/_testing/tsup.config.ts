import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: false,
	clean: true,
	external: ["zod", "vitest", "@frontal-labs/_core"],
});
