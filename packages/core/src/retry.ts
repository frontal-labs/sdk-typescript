import { JITTER_MAX, EXPONENTIAL_BASE } from "./constants";
import type { RetryConfig } from "./schemas";

/**
 * Calculates the delay for a retry attempt based on the configured strategy.
 * Adds jitter to prevent thundering herd problems.
 *
 * @param attempt - Current retry attempt number (0-based)
 * @param config - Retry configuration settings
 * @returns Delay in milliseconds before the next retry
 *
 * @example
 * ```typescript
 * const config: RetryConfig = { retryDelay: 1000, backoff: 'exponential', maxRetries: 3, retryOn: [] }
 *
 * calculateDelay(0, config) // ~1000ms + jitter
 * calculateDelay(1, config) // ~2000ms + jitter
 * calculateDelay(2, config) // ~4000ms + jitter
 * ```
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
	// Add jitter to prevent thundering herd
	const jitter = Math.random() * JITTER_MAX;

	// Calculate delay based on backoff strategy
	switch (config.backoff) {
		case "exponential":
			// Exponential backoff: delay * base^attempt
			return config.retryDelay * EXPONENTIAL_BASE ** attempt + jitter;
		case "linear":
			// Linear backoff: delay * (attempt + 1)
			return config.retryDelay * (attempt + 1) + jitter;
		case "constant":
			// Constant backoff: fixed delay
			return config.retryDelay + jitter;
	}
}
