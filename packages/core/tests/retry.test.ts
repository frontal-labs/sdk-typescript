/**
 * Comprehensive tests for retry logic and strategies
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { calculateDelay } from "../src/retry";
import { cleanupMocks } from "./setup";

describe("Retry Logic", () => {
	beforeEach(() => {
		cleanupMocks();
	});

	afterEach(() => {
		cleanupMocks();
	});

	describe("calculateDelay", () => {
		describe("Exponential backoff strategy", () => {
			it("should calculate exponential delays correctly", () => {
				const baseDelay = 1000;

				// Test first few attempts
				expect(calculateDelay(0, "exponential", baseDelay)).toBe(baseDelay); // 1 * 1000
				expect(calculateDelay(1, "exponential", baseDelay)).toBe(baseDelay * 2); // 2 * 1000
				expect(calculateDelay(2, "exponential", baseDelay)).toBe(baseDelay * 4); // 4 * 1000
				expect(calculateDelay(3, "exponential", baseDelay)).toBe(baseDelay * 8); // 8 * 1000
				expect(calculateDelay(4, "exponential", baseDelay)).toBe(
					baseDelay * 16,
				); // 16 * 1000
			});

			it("should handle different base delays with exponential strategy", () => {
				const baseDelays = [100, 500, 1000, 2000, 5000];

				baseDelays.forEach((baseDelay) => {
					const attempt1 = calculateDelay(0, "exponential", baseDelay);
					const attempt2 = calculateDelay(1, "exponential", baseDelay);
					const attempt3 = calculateDelay(2, "exponential", baseDelay);

					expect(attempt1).toBe(baseDelay);
					expect(attempt2).toBe(baseDelay * 2);
					expect(attempt3).toBe(baseDelay * 4);
				});
			});

			it("should handle large attempt numbers", () => {
				const baseDelay = 1000;

				// Test larger attempts
				expect(calculateDelay(5, "exponential", baseDelay)).toBe(
					baseDelay * 64,
				); // 2^6
				expect(calculateDelay(10, "exponential", baseDelay)).toBe(
					baseDelay * 2048,
				); // 2^11
				expect(calculateDelay(15, "exponential", baseDelay)).toBe(
					baseDelay * 65536,
				); // 2^16
			});

			it("should work with jitter enabled", () => {
				const baseDelay = 1000;
				const attempt = 2;

				// With jitter, delay should be between baseDelay and baseDelay + jitterMax
				const delay = calculateDelay(attempt, "exponential", baseDelay, true);

				// Should be exponential delay plus some jitter
				const expectedBase = baseDelay * 2 ** attempt;
				expect(delay).toBeGreaterThanOrEqual(expectedBase);
				expect(delay).toBeLessThan(expectedBase + 201); // JITTER_MAX is 200
			});

			it("should work without jitter", () => {
				const baseDelay = 1000;
				const attempt = 3;

				const delay = calculateDelay(attempt, "exponential", baseDelay, false);

				// Should be exactly exponential delay without jitter
				expect(delay).toBe(baseDelay * 2 ** attempt);
			});
		});

		describe("Linear backoff strategy", () => {
			it("should calculate linear delays correctly", () => {
				const baseDelay = 1000;

				expect(calculateDelay(0, "linear", baseDelay)).toBe(baseDelay); // 1 * 1000
				expect(calculateDelay(1, "linear", baseDelay)).toBe(baseDelay * 2); // 2 * 1000
				expect(calculateDelay(2, "linear", baseDelay)).toBe(baseDelay * 3); // 3 * 1000
				expect(calculateDelay(3, "linear", baseDelay)).toBe(baseDelay * 4); // 4 * 1000
				expect(calculateDelay(4, "linear", baseDelay)).toBe(baseDelay * 5); // 5 * 1000
			});

			it("should handle different base delays with linear strategy", () => {
				const baseDelays = [100, 500, 1000, 2000];

				baseDelays.forEach((baseDelay) => {
					const attempt1 = calculateDelay(0, "linear", baseDelay);
					const attempt2 = calculateDelay(1, "linear", baseDelay);
					const attempt3 = calculateDelay(2, "linear", baseDelay);

					expect(attempt1).toBe(baseDelay);
					expect(attempt2).toBe(baseDelay * 2);
					expect(attempt3).toBe(baseDelay * 3);
				});
			});

			it("should handle large attempt numbers", () => {
				const baseDelay = 1000;

				expect(calculateDelay(10, "linear", baseDelay)).toBe(baseDelay * 11); // (10 + 1) * 1000
				expect(calculateDelay(50, "linear", baseDelay)).toBe(baseDelay * 51); // (50 + 1) * 1000
				expect(calculateDelay(100, "linear", baseDelay)).toBe(baseDelay * 101); // (100 + 1) * 1000
			});

			it("should work with jitter enabled", () => {
				const baseDelay = 1000;
				const attempt = 5;

				const delay = calculateDelay(attempt, "linear", baseDelay, true);

				const expectedBase = baseDelay * (attempt + 1);
				expect(delay).toBeGreaterThanOrEqual(expectedBase);
				expect(delay).toBeLessThan(expectedBase + 201);
			});

			it("should work without jitter", () => {
				const baseDelay = 1000;
				const attempt = 3;

				const delay = calculateDelay(attempt, "linear", baseDelay, false);

				expect(delay).toBe(baseDelay * (attempt + 1));
			});
		});

		describe("Constant backoff strategy", () => {
			it("should return constant delay regardless of attempt", () => {
				const baseDelay = 1000;

				expect(calculateDelay(0, "constant", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(1, "constant", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(2, "constant", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(5, "constant", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(10, "constant", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(100, "constant", baseDelay)).toBe(baseDelay);
			});

			it("should handle different base delays with constant strategy", () => {
				const baseDelays = [100, 500, 1000, 2000, 5000];

				baseDelays.forEach((baseDelay) => {
					expect(calculateDelay(0, "constant", baseDelay)).toBe(baseDelay);
					expect(calculateDelay(5, "constant", baseDelay)).toBe(baseDelay);
					expect(calculateDelay(10, "constant", baseDelay)).toBe(baseDelay);
				});
			});

			it("should work with jitter enabled", () => {
				const baseDelay = 1000;
				const attempt = 5;

				const delay = calculateDelay(attempt, "constant", baseDelay, true);

				expect(delay).toBeGreaterThanOrEqual(baseDelay);
				expect(delay).toBeLessThan(baseDelay + 201);
			});

			it("should work without jitter", () => {
				const baseDelay = 1000;
				const attempt = 3;

				const delay = calculateDelay(attempt, "constant", baseDelay, false);

				expect(delay).toBe(baseDelay);
			});
		});

		describe("Jitter behavior", () => {
			it("should add random jitter when enabled", () => {
				const baseDelay = 1000;
				const attempt = 2;
				const strategy = "exponential";

				// Generate multiple delays to see variation
				const delays = Array.from({ length: 100 }, () =>
					calculateDelay(attempt, strategy, baseDelay, true),
				);

				// All delays should be within expected range
				const expectedBase = baseDelay * 2 ** attempt;
				delays.forEach((delay) => {
					expect(delay).toBeGreaterThanOrEqual(expectedBase);
					expect(delay).toBeLessThan(expectedBase + 201);
				});

				// There should be some variation (not all delays are the same)
				const uniqueDelays = new Set(delays);
				expect(uniqueDelays.size).toBeGreaterThan(1);
			});

			it("should produce consistent delays when jitter is disabled", () => {
				const baseDelay = 1000;
				const attempt = 2;
				const strategy = "exponential";

				// Generate multiple delays
				const delays = Array.from({ length: 10 }, () =>
					calculateDelay(attempt, strategy, baseDelay, false),
				);

				// All delays should be identical
				const uniqueDelays = new Set(delays);
				expect(uniqueDelays.size).toBe(1);

				// Should be exactly the expected delay
				const expectedDelay = baseDelay * 2 ** attempt;
				delays.forEach((delay) => {
					expect(delay).toBe(expectedDelay);
				});
			});

			it("should handle jitter with different strategies", () => {
				const baseDelay = 500;
				const attempt = 1;

				const strategies = ["exponential", "linear", "constant"] as const;

				strategies.forEach((strategy) => {
					const delayWithJitter = calculateDelay(
						attempt,
						strategy,
						baseDelay,
						true,
					);
					const delayWithoutJitter = calculateDelay(
						attempt,
						strategy,
						baseDelay,
						false,
					);

					// With jitter should be greater than or equal to without jitter
					expect(delayWithJitter).toBeGreaterThanOrEqual(delayWithoutJitter);

					// But not too much greater (within jitter range)
					expect(delayWithJitter).toBeLessThan(delayWithoutJitter + 201);
				});
			});
		});

		describe("Edge cases and validation", () => {
			it("should handle zero attempt number", () => {
				const baseDelay = 1000;

				expect(calculateDelay(0, "exponential", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(0, "linear", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(0, "constant", baseDelay)).toBe(baseDelay);
			});

			it("should handle very small base delays", () => {
				const baseDelay = 1;

				expect(calculateDelay(0, "exponential", baseDelay)).toBe(1);
				expect(calculateDelay(1, "exponential", baseDelay)).toBe(2);
				expect(calculateDelay(2, "exponential", baseDelay)).toBe(4);

				expect(calculateDelay(0, "linear", baseDelay)).toBe(1);
				expect(calculateDelay(1, "linear", baseDelay)).toBe(2);
				expect(calculateDelay(2, "linear", baseDelay)).toBe(3);

				expect(calculateDelay(0, "constant", baseDelay)).toBe(1);
				expect(calculateDelay(5, "constant", baseDelay)).toBe(1);
			});

			it("should handle very large base delays", () => {
				const baseDelay = 100000; // 100 seconds

				expect(calculateDelay(0, "exponential", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(1, "exponential", baseDelay)).toBe(baseDelay * 2);
				expect(calculateDelay(2, "exponential", baseDelay)).toBe(baseDelay * 4);

				// Should handle large numbers without overflow
				expect(calculateDelay(10, "exponential", baseDelay)).toBe(
					baseDelay * 2 ** 10,
				);
			});

			it("should handle negative attempt numbers gracefully", () => {
				const baseDelay = 1000;

				// Negative attempts should still work (though not typical usage)
				expect(calculateDelay(-1, "exponential", baseDelay)).toBe(
					baseDelay / 2,
				);
				expect(calculateDelay(-2, "exponential", baseDelay)).toBe(
					baseDelay / 4,
				);

				expect(calculateDelay(-1, "linear", baseDelay)).toBe(0); // Should not go below 0
				expect(calculateDelay(-5, "linear", baseDelay)).toBe(0); // Should not go below 0

				expect(calculateDelay(-1, "constant", baseDelay)).toBe(baseDelay);
				expect(calculateDelay(-10, "constant", baseDelay)).toBe(baseDelay);
			});

			it("should handle fractional base delays", () => {
				const baseDelay = 123.456;

				expect(calculateDelay(0, "exponential", baseDelay)).toBeCloseTo(
					baseDelay,
					3,
				);
				expect(calculateDelay(1, "exponential", baseDelay)).toBeCloseTo(
					baseDelay * 2,
					3,
				);
				expect(calculateDelay(2, "exponential", baseDelay)).toBeCloseTo(
					baseDelay * 4,
					3,
				);

				expect(calculateDelay(0, "linear", baseDelay)).toBeCloseTo(
					baseDelay,
					3,
				);
				expect(calculateDelay(1, "linear", baseDelay)).toBeCloseTo(
					baseDelay * 2,
					3,
				);
				expect(calculateDelay(2, "linear", baseDelay)).toBeCloseTo(
					baseDelay * 3,
					3,
				);

				expect(calculateDelay(0, "constant", baseDelay)).toBeCloseTo(
					baseDelay,
					3,
				);
				expect(calculateDelay(5, "constant", baseDelay)).toBeCloseTo(
					baseDelay,
					3,
				);
			});
		});

		describe("Performance and consistency", () => {
			it("should be performant for large numbers of calculations", () => {
				const baseDelay = 1000;
				const iterations = 10000;

				const startTime = performance.now();

				for (let i = 0; i < iterations; i++) {
					calculateDelay(i % 100, "exponential", baseDelay, true);
				}

				const endTime = performance.now();
				const duration = endTime - startTime;

				// Should complete quickly (less than 100ms for 10k operations)
				expect(duration).toBeLessThan(100);
			});

			it("should produce deterministic results without jitter", () => {
				const baseDelay = 1000;
				const attempt = 5;
				const strategy = "exponential";

				// Multiple calls should produce identical results
				const result1 = calculateDelay(attempt, strategy, baseDelay, false);
				const result2 = calculateDelay(attempt, strategy, baseDelay, false);
				const result3 = calculateDelay(attempt, strategy, baseDelay, false);

				expect(result1).toBe(result2);
				expect(result2).toBe(result3);
			});

			it("should handle concurrent calls safely", async () => {
				const baseDelay = 1000;
				const strategy = "exponential";
				const attempts = Array.from({ length: 100 }, (_, i) => i);

				// Run calculations concurrently
				const promises = attempts.map((attempt) =>
					Promise.resolve(calculateDelay(attempt, strategy, baseDelay, false)),
				);

				const results = await Promise.all(promises);

				// Results should be correct
				results.forEach((delay, index) => {
					expect(delay).toBe(baseDelay * 2 ** index);
				});
			});
		});

		describe("Real-world scenarios", () => {
			it("should simulate typical retry scenarios", () => {
				const baseDelay = 1000; // 1 second

				// Scenario 1: Quick recovery (max 3 retries)
				const quickRetryDelays = [
					calculateDelay(0, "exponential", baseDelay), // 1s
					calculateDelay(1, "exponential", baseDelay), // 2s
					calculateDelay(2, "exponential", baseDelay), // 4s
				];

				expect(quickRetryDelays).toEqual([1000, 2000, 4000]);

				// Scenario 2: Slow recovery with linear backoff
				const linearRetryDelays = [
					calculateDelay(0, "linear", baseDelay), // 1s
					calculateDelay(1, "linear", baseDelay), // 2s
					calculateDelay(2, "linear", baseDelay), // 3s
					calculateDelay(3, "linear", baseDelay), // 4s
					calculateDelay(4, "linear", baseDelay), // 5s
				];

				expect(linearRetryDelays).toEqual([1000, 2000, 3000, 4000, 5000]);

				// Scenario 3: Rate limiting with constant backoff
				const constantRetryDelays = [
					calculateDelay(0, "constant", baseDelay), // 1s
					calculateDelay(1, "constant", baseDelay), // 1s
					calculateDelay(2, "constant", baseDelay), // 1s
					calculateDelay(3, "constant", baseDelay), // 1s
					calculateDelay(4, "constant", baseDelay), // 1s
				];

				expect(constantRetryDelays).toEqual([1000, 1000, 1000, 1000, 1000]);
			});

			it("should handle network timeout scenarios", () => {
				const baseDelay = 5000; // 5 seconds for network issues

				// Exponential backoff for network timeouts
				const networkRetryDelays = [
					calculateDelay(0, "exponential", baseDelay), // 5s
					calculateDelay(1, "exponential", baseDelay), // 10s
					calculateDelay(2, "exponential", baseDelay), // 20s
					calculateDelay(3, "exponential", baseDelay), // 40s
				];

				expect(networkRetryDelays).toEqual([5000, 10000, 20000, 40000]);
			});

			it("should handle rate limiting scenarios", () => {
				const baseDelay = 60000; // 1 minute for rate limiting

				// Linear backoff for rate limiting
				const rateLimitDelays = [
					calculateDelay(0, "linear", baseDelay), // 1 minute
					calculateDelay(1, "linear", baseDelay), // 2 minutes
					calculateDelay(2, "linear", baseDelay), // 3 minutes
					calculateDelay(3, "linear", baseDelay), // 4 minutes
				];

				expect(rateLimitDelays).toEqual([60000, 120000, 180000, 240000]);
			});

			it("should handle quick retry scenarios", () => {
				const baseDelay = 100; // 100ms for quick retries

				// Exponential backoff for quick retries
				const quickRetryDelays = [
					calculateDelay(0, "exponential", baseDelay), // 100ms
					calculateDelay(1, "exponential", baseDelay), // 200ms
					calculateDelay(2, "exponential", baseDelay), // 400ms
					calculateDelay(3, "exponential", baseDelay), // 800ms
				];

				expect(quickRetryDelays).toEqual([100, 200, 400, 800]);
			});
		});

		describe("Integration with jitter for production use", () => {
			it("should prevent thundering herd with jitter", () => {
				const baseDelay = 1000;
				const attempt = 2;
				const strategy = "exponential";

				// Simulate multiple clients retrying simultaneously
				const clientCount = 50;
				const delays = Array.from({ length: clientCount }, () =>
					calculateDelay(attempt, strategy, baseDelay, true),
				);

				// All delays should be within the expected range
				const expectedBase = baseDelay * 2 ** attempt;
				delays.forEach((delay) => {
					expect(delay).toBeGreaterThanOrEqual(expectedBase);
					expect(delay).toBeLessThan(expectedBase + 201);
				});

				// Should have good distribution to prevent thundering herd
				const uniqueDelays = new Set(delays);
				expect(uniqueDelays.size).toBeGreaterThan(clientCount * 0.8); // At least 80% unique
			});

			it("should maintain reasonable delay ranges with jitter", () => {
				const baseDelay = 2000;
				const attempt = 3;
				const strategy = "exponential";

				// Generate many samples to check distribution
				const samples = 1000;
				const delays = Array.from({ length: samples }, () =>
					calculateDelay(attempt, strategy, baseDelay, true),
				);

				const expectedBase = baseDelay * 2 ** attempt;
				const minDelay = Math.min(...delays);
				const maxDelay = Math.max(...delays);
				const avgDelay =
					delays.reduce((sum, delay) => sum + delay, 0) / delays.length;

				// Min should be close to expected base
				expect(minDelay).toBeGreaterThanOrEqual(expectedBase);
				expect(minDelay).toBeLessThan(expectedBase + 10);

				// Max should be close to expected base + jitter max
				expect(maxDelay).toBeLessThan(expectedBase + 201);

				// Average should be roughly in the middle
				expect(avgDelay).toBeGreaterThan(expectedBase);
				expect(avgDelay).toBeLessThan(expectedBase + 100);
			});
		});
	});
});
