import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Inherit from root config but override package-specific settings
		environment: "node",

		// Test files specific to this package
		include: [
			"src/**/*.test.ts",
			"src/**/*.spec.ts",
			"tests/**/*.test.ts",
			"tests/**/*.spec.ts",
		],

		// Exclude patterns
		exclude: ["node_modules", "dist", "**/*.d.ts"],

		// Package-specific test timeout
		testTimeout: 5000,

		// Hook timeout
		hookTimeout: 5000,

		// Isolate tests for this package
		isolate: true,

		// Coverage for this package only
		coverage: {
			provider: "v8",
			reporter: ["text", "json"],
			reportsDirectory: "../../coverage/packages/storage",
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

	// Resolve configuration for this package
	resolve: {
		alias: {
			"@": "./src",
		},
	},
});
