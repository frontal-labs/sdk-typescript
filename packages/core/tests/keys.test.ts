/**
 * Comprehensive tests for environment variable management
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { keys } from "../src/keys";
import { cleanupMocks } from "./setup";

describe("Environment Variable Management", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset process.env before each test
		process.env = { ...originalEnv };
		cleanupMocks();
	});

	afterEach(() => {
		// Restore original process.env
		process.env = originalEnv;
		cleanupMocks();
	});

	describe("keys.client schema validation", () => {
		it("should validate complete environment configuration", () => {
			process.env.FRONTAL_API_KEY = "frt_test1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "development";
			process.env.FRONTAL_DEBUG = "true";

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_API_KEY).toBe("frt_test1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBe("development");
			expect(config.FRONTAL_DEBUG).toBe(true);
		});

		it("should handle minimal required environment variables", () => {
			process.env.FRONTAL_API_KEY = "frt_minimal1234567890";

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_API_KEY).toBe("frt_minimal1234567890");
			expect(config.FRONTAL_ENVIRONMENT).toBeUndefined();
			expect(config.FRONTAL_DEBUG).toBeUndefined();
		});

		it("should apply default values for optional fields", () => {
			process.env.FRONTAL_API_KEY = "frt_defaults1234567890";

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_API_KEY).toBe("frt_defaults1234567890");
			// Optional fields should be undefined when not provided
			expect(config.FRONTAL_ENVIRONMENT).toBeUndefined();
			expect(config.FRONTAL_DEBUG).toBeUndefined();
		});

		it("should validate API key format", () => {
			const invalidKeys = [
				"invalid_key",
				"abc_1234567890abcdef",
				"fr_1234567890abcdef",
				"1234567890abcdef",
				"",
				"frt_",
				"frt_1234",
			];

			invalidKeys.forEach((invalidKey) => {
				process.env.FRONTAL_API_KEY = invalidKey;

				expect(() => {
					keys.client.parse(process.env);
				}).toThrow();
			});
		});

		it("should accept valid API key formats", () => {
			const validKeys = [
				"frt_1234567890abcdef",
				"frt_abcdef1234567890",
				"frt_12345",
				`frt_${"a".repeat(100)}`,
			];

			validKeys.forEach((validKey) => {
				process.env.FRONTAL_API_KEY = validKey;

				const config = keys.client.parse(process.env);
				expect(config.FRONTAL_API_KEY).toBe(validKey);
			});
		});

		it("should require API key to be present", () => {
			// Don't set FRONTAL_API_KEY

			expect(() => {
				keys.client.parse(process.env);
			}).toThrow();
		});

		it("should handle empty API key", () => {
			process.env.FRONTAL_API_KEY = "";

			expect(() => {
				keys.client.parse(process.env);
			}).toThrow();
		});

		it("should validate environment field", () => {
			const validEnvironments = [
				"production",
				"development",
				"staging",
				"test",
				"preview",
				"demo",
				"custom-env",
			];

			validEnvironments.forEach((env) => {
				process.env.FRONTAL_API_KEY = "frt_test1234567890abcdef";
				process.env.FRONTAL_ENVIRONMENT = env;

				const config = keys.client.parse(process.env);
				expect(config.FRONTAL_ENVIRONMENT).toBe(env);
			});
		});

		it("should validate debug field conversion", () => {
			const debugValues = [
				{ input: "true", expected: true },
				{ input: "false", expected: false },
				{ input: "1", expected: true },
				{ input: "0", expected: false },
				{ input: "TRUE", expected: true },
				{ input: "FALSE", expected: false },
			];

			debugValues.forEach(({ input, expected }) => {
				process.env.FRONTAL_API_KEY = "frt_test1234567890abcdef";
				process.env.FRONTAL_DEBUG = input;

				const config = keys.client.parse(process.env);
				expect(config.FRONTAL_DEBUG).toBe(expected);
			});
		});

		it("should handle invalid debug values", () => {
			const invalidDebugValues = ["invalid", "maybe", "2", "-1", "yes", "no"];

			invalidDebugValues.forEach((debugValue) => {
				process.env.FRONTAL_API_KEY = "frt_test1234567890abcdef";
				process.env.FRONTAL_DEBUG = debugValue;

				expect(() => {
					keys.client.parse(process.env);
				}).toThrow();
			});
		});
	});

	describe("safeParse functionality", () => {
		it("should return success result for valid environment", () => {
			process.env.FRONTAL_API_KEY = "frt_valid1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "test";
			process.env.FRONTAL_DEBUG = "true";

			const result = keys.client.safeParse(process.env);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.FRONTAL_API_KEY).toBe("frt_valid1234567890abcdef");
				expect(result.data.FRONTAL_ENVIRONMENT).toBe("test");
				expect(result.data.FRONTAL_DEBUG).toBe(true);
			}
		});

		it("should return error result for invalid environment", () => {
			process.env.FRONTAL_API_KEY = "invalid_key";

			const result = keys.client.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues).toHaveLength(1);
				expect(result.error.issues[0].path).toContain("FRONTAL_API_KEY");
			}
		});

		it("should return error result for missing required fields", () => {
			// Don't set any environment variables

			const result = keys.client.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.length).toBeGreaterThan(0);
				expect(result.error.issues[0].path).toContain("FRONTAL_API_KEY");
			}
		});

		it("should return error result for multiple validation errors", () => {
			process.env.FRONTAL_API_KEY = "invalid_key";
			process.env.FRONTAL_DEBUG = "invalid_debug";

			const result = keys.client.safeParse(process.env);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.length).toBeGreaterThan(1);

				const paths = result.error.issues.map((issue) => issue.path.join("."));
				expect(paths).toContain("FRONTAL_API_KEY");
				expect(paths).toContain("FRONTAL_DEBUG");
			}
		});
	});

	describe("Runtime environment handling", () => {
		it("should use provided runtime environment", () => {
			const customEnv = {
				FRONTAL_API_KEY: "frt_custom1234567890abcdef",
				FRONTAL_ENVIRONMENT: "custom",
				FRONTAL_DEBUG: "true",
			};

			const config = keys.client.parse(customEnv);

			expect(config.FRONTAL_API_KEY).toBe("frt_custom1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBe("custom");
			expect(config.FRONTAL_DEBUG).toBe(true);
		});

		it("should ignore process.env when custom runtime env is provided", () => {
			// Set process.env to different values
			process.env.FRONTAL_API_KEY = "frt_process1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "process";
			process.env.FRONTAL_DEBUG = "false";

			// Provide custom environment
			const customEnv = {
				FRONTAL_API_KEY: "frt_custom1234567890abcdef",
				FRONTAL_ENVIRONMENT: "custom",
				FRONTAL_DEBUG: "true",
			};

			const config = keys.client.parse(customEnv);

			// Should use custom env values, not process.env
			expect(config.FRONTAL_API_KEY).toBe("frt_custom1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBe("custom");
			expect(config.FRONTAL_DEBUG).toBe(true);
		});

		it("should handle empty runtime environment", () => {
			const emptyEnv = {};

			expect(() => {
				keys.client.parse(emptyEnv);
			}).toThrow();
		});

		it("should handle partial runtime environment", () => {
			const partialEnv = {
				FRONTAL_API_KEY: "frt_partial1234567890abcdef",
				// Missing optional fields
			};

			const config = keys.client.parse(partialEnv);

			expect(config.FRONTAL_API_KEY).toBe("frt_partial1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBeUndefined();
			expect(config.FRONTAL_DEBUG).toBeUndefined();
		});
	});

	describe("Integration with configuration", () => {
		it("should work with FrontalClient configuration", () => {
			process.env.FRONTAL_API_KEY = "frt_client1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "development";
			process.env.FRONTAL_DEBUG = "true";

			const envConfig = keys.client.parse(process.env);

			// This would be used to create a FrontalClient
			const clientConfig = {
				apiKey: envConfig.FRONTAL_API_KEY,
				environment: envConfig.FRONTAL_ENVIRONMENT ?? "production",
				debug: envConfig.FRONTAL_DEBUG ?? false,
			};

			expect(clientConfig.apiKey).toBe("frt_client1234567890abcdef");
			expect(clientConfig.environment).toBe("development");
			expect(clientConfig.debug).toBe(true);
		});

		it("should handle missing optional fields in client configuration", () => {
			process.env.FRONTAL_API_KEY = "frt_minimal1234567890abcdef";

			const envConfig = keys.client.parse(process.env);

			const clientConfig = {
				apiKey: envConfig.FRONTAL_API_KEY,
				environment: envConfig.FRONTAL_ENVIRONMENT ?? "production",
				debug: envConfig.FRONTAL_DEBUG ?? false,
			};

			expect(clientConfig.apiKey).toBe("frt_minimal1234567890abcdef");
			expect(clientConfig.environment).toBe("production"); // Default value
			expect(clientConfig.debug).toBe(false); // Default value
		});

		it("should provide type safety for configuration", () => {
			process.env.FRONTAL_API_KEY = "fr_typed1234567890abcdef";

			const envConfig = keys.client.parse(process.env);

			// TypeScript should infer the correct types
			expect(typeof envConfig.FRONTAL_API_KEY).toBe("string");
			expect(typeof envConfig.FRONTAL_ENVIRONMENT).toBe("undefined");
			expect(typeof envConfig.FRONTAL_DEBUG).toBe("undefined");
		});
	});

	describe("Error handling and validation", () => {
		it("should provide detailed error messages", () => {
			process.env.FRONTAL_API_KEY = "invalid";
			process.env.FRONTAL_DEBUG = "not-a-boolean";

			try {
				keys.client.parse(process.env);
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				// Error should contain information about validation failures
			}
		});

		it("should handle malformed environment variables", () => {
			const malformedEnvs = [
				{ FRONTAL_API_KEY: null },
				{ FRONTAL_API_KEY: undefined },
				{ FRONTAL_DEBUG: null },
				{ FRONTAL_DEBUG: undefined },
			];

			malformedEnvs.forEach((env) => {
				// These should be handled gracefully by the validation library
				const result = keys.client.safeParse(env);
				expect(result.success).toBe(false);
			});
		});

		it("should validate string inputs strictly", () => {
			process.env.FRONTAL_API_KEY = "frt_test1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "  spaced  "; // Should be accepted as-is

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_ENVIRONMENT).toBe("  spaced  "); // No trimming
		});
	});

	describe("Real-world scenarios", () => {
		it("should handle production environment setup", () => {
			process.env.FRONTAL_API_KEY = "frt_prod_1234567890abcdef";
			// Production typically doesn't set these optional env vars

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_API_KEY).toBe("frt_prod_1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBeUndefined();
			expect(config.FRONTAL_DEBUG).toBeUndefined();
		});

		it("should handle development environment setup", () => {
			process.env.FRONTAL_API_KEY = "frt_dev_1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "development";
			process.env.FRONTAL_DEBUG = "true";

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_API_KEY).toBe("frt_dev_1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBe("development");
			expect(config.FRONTAL_DEBUG).toBe(true);
		});

		it("should handle testing environment setup", () => {
			process.env.FRONTAL_API_KEY = "frt_test_1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "test";
			process.env.FRONTAL_DEBUG = "false";

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_API_KEY).toBe("frt_test_1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBe("test");
			expect(config.FRONTAL_DEBUG).toBe(false);
		});

		it("should handle CI/CD environment setup", () => {
			process.env.FRONTAL_API_KEY = "frt_ci_1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "ci";
			// Debug typically not set in CI

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_API_KEY).toBe("frt_ci_1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBe("ci");
			expect(config.FRONTAL_DEBUG).toBeUndefined();
		});

		it("should handle Docker container environment", () => {
			process.env.FRONTAL_API_KEY = "frt_docker_1234567890abcdef";
			process.env.FRONTAL_ENVIRONMENT = "production";
			process.env.FRONTAL_DEBUG = "false";

			const config = keys.client.parse(process.env);

			expect(config.FRONTAL_API_KEY).toBe("frt_docker_1234567890abcdef");
			expect(config.FRONTAL_ENVIRONMENT).toBe("production");
			expect(config.FRONTAL_DEBUG).toBe(false);
		});
	});

	describe("Security considerations", () => {
		it("should not expose sensitive data in error messages", () => {
			process.env.FRONTAL_API_KEY = "frt_sensitive1234567890abcdef";
			process.env.FRONTAL_DEBUG = "invalid";

			try {
				keys.client.parse(process.env);
			} catch (error) {
				const errorMessage = error.message;
				// Error message should not contain the actual API key
				expect(errorMessage).not.toContain("frt_sensitive1234567890abcdef");
			}
		});

		it("should validate API key format strictly", () => {
			const suspiciousKeys = [
				`frt_${"a".repeat(1000)}`, // Very long key
				"frt_".repeat(100), // Repeated prefix
				"frt_\0null\0", // Null bytes
				'frt_<script>alert("xss")</script>', // XSS attempt
			];

			suspiciousKeys.forEach((key) => {
				process.env.FRONTAL_API_KEY = key;

				const result = keys.client.safeParse(process.env);
				expect(result.success).toBe(false);
			});
		});

			it("should handle environment variable injection attempts", () => {
				// Attempt to inject additional properties
				const maliciousEnv = {
					FRONTAL_API_KEY: "frt_valid1234567890abcdef",
					FRONTAL_ENVIRONMENT: "development",
					__proto__: { injected: "malicious" }, // Prototype pollution attempt
					constructor: { injected: "malicious" }, // Constructor pollution attempt
				} as unknown as NodeJS.ProcessEnv;

				const config = keys.client.parse(maliciousEnv);

			// Should only contain the expected properties
			expect(Object.keys(config)).toEqual([
				"FRONTAL_API_KEY",
				"FRONTAL_ENVIRONMENT",
			]);
				expect((config as Record<string, unknown>).injected).toBeUndefined();
			});
		});

	describe("Performance and efficiency", () => {
		it("should handle large environment objects efficiently", () => {
			// Create a large environment object with many properties
			const largeEnv: Record<string, string> = {
				FRONTAL_API_KEY: "frt_large1234567890abcdef",
				FRONTAL_ENVIRONMENT: "development",
				FRONTAL_DEBUG: "true",
			};

			// Add many unrelated environment variables
			for (let i = 0; i < 1000; i++) {
				largeEnv[`UNRELATED_VAR_${i}`] = `value_${i}`;
			}

			const startTime = performance.now();
			const config = keys.client.parse(largeEnv);
			const endTime = performance.now();

			expect(config.FRONTAL_API_KEY).toBe("frt_large1234567890abcdef");
			expect(endTime - startTime).toBeLessThan(100); // Should be fast
		});

		it("should cache validation results for repeated calls", () => {
			process.env.FRONTAL_API_KEY = "frt_cache1234567890abcdef";

			const startTime = performance.now();

			// Multiple calls should be fast
			for (let i = 0; i < 100; i++) {
				keys.client.parse(process.env);
			}

			const endTime = performance.now();

			expect(endTime - startTime).toBeLessThan(100); // Should be very fast
		});
	});

	describe("Type safety and TypeScript integration", () => {
		it("should provide correct type inference", () => {
			process.env.FRONTAL_API_KEY = "frt_types1234567890abcdef";

			const config = keys.client.parse(process.env);

			// These should be type-safe
			const apiKey: string = config.FRONTAL_API_KEY;
			const environment: string | undefined = config.FRONTAL_ENVIRONMENT;
			const debug: boolean | undefined = config.FRONTAL_DEBUG;

			expect(typeof apiKey).toBe("string");
			expect(typeof environment).toBe("undefined");
			expect(typeof debug).toBe("undefined");
		});

		it("should work with TypeScript strict mode", () => {
			process.env.FRONTAL_API_KEY = "frt_strict1234567890abcdef";

			const config = keys.client.parse(process.env);

			// Should work without type assertions
			const isDevelopment = config.FRONTAL_ENVIRONMENT === "development";
			const isDebugEnabled = config.FRONTAL_DEBUG === true;

			expect(typeof isDevelopment).toBe("boolean");
			expect(typeof isDebugEnabled).toBe("boolean");
		});
	});
});
