import { TimeoutError } from "./errors";
import { calculateDelay } from "./retry";

/**
 * Options for the pollUntil utility.
 */
export interface PollOptions<T> {
	/** Check interval in milliseconds. Default: 2000. */
	interval?: number;
	/** Maximum total wait time in milliseconds. Default: 300000 (5 minutes). */
	timeout?: number;
	/** Predicate: return true when polling should stop. Default: truthy result. */
	until?: (result: T) => boolean;
	/** Backoff strategy for interval growth. Default: 'constant'. */
	backoff?: "constant" | "linear" | "exponential";
	/** AbortSignal to cancel polling externally. */
	signal?: AbortSignal;
}

/**
 * Polls an async function until a condition is met or timeout is reached.
 *
 * @param fn - Async function to poll
 * @param options - Polling configuration
 * @returns The result that satisfied the condition
 * @throws TimeoutError if the timeout is exceeded
 *
 * @example
 * ```typescript
 * const execution = await pollUntil(
 *   () => agent.execution('exec-123'),
 *   { until: (e) => e.status === 'completed', interval: 3000 }
 * )
 * ```
 */
export async function pollUntil<T>(
	fn: () => Promise<T>,
	options: PollOptions<T> = {},
): Promise<T> {
	const {
		interval = 2000,
		timeout = 300_000,
		until = (r: T) => Boolean(r),
		backoff = "constant",
		signal,
	} = options;

	const retryConfig = {
		baseDelay: interval,
		strategy: backoff,
		maxAttempts: Infinity,
		on: [] as number[],
		jitter: true,
	};
	const start = Date.now();
	let attempt = 0;

	while (true) {
		if (signal?.aborted) {
			throw new TimeoutError("Polling aborted");
		}

		const result = await fn();
		if (until(result)) return result;

		const elapsed = Date.now() - start;
		if (elapsed >= timeout) {
			throw new TimeoutError(`Polling timed out after ${timeout}ms`);
		}

		const delay = calculateDelay(attempt, retryConfig);
		const remaining = timeout - (Date.now() - start);
		await sleep(Math.min(delay, remaining));
		attempt++;
	}
}

/**
 * Wraps a promise with a timeout. Rejects with TimeoutError if
 * the promise does not resolve within the specified duration.
 *
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds
 * @param message - Optional custom error message
 * @returns The resolved value of the promise
 * @throws TimeoutError if the timeout is exceeded
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   longRunningOperation(),
 *   30000,
 *   'Operation took too long'
 * )
 * ```
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	message?: string,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() =>
				reject(
					new TimeoutError(message ?? `Operation timed out after ${ms}ms`),
				),
			ms,
		);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		if (timer) {
			clearTimeout(timer);
		}
	}
}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));
