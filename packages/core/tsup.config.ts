import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: false,
	clean: true,
	external: ["zod"],
	// Bundled because the upstream package is ESM-only; this package also ships CJS.
	noExternal: ["@frontal-labs/error"],
});
