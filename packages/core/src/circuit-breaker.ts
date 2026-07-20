/**
 * Circuit breaker states:
 * - `CLOSED`: Normal operation, requests pass through.
 * - `OPEN`: Failure threshold exceeded, requests are rejected.
 * - `HALF_OPEN`: After reset timeout, a single probe request is allowed.
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Configuration for the CircuitBreaker.
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit. */
  failureThreshold: number;
  /** Milliseconds to wait before transitioning from OPEN to HALF_OPEN. */
  resetTimeoutMs: number;
  /** Called when the circuit transitions to OPEN. */
  onOpen?: () => void;
  /** Called when the circuit transitions back to CLOSED. */
  onClose?: () => void;
  /** Called when the circuit transitions to HALF_OPEN for a probe. */
  onHalfOpen?: () => void;
}

/**
 * Circuit breaker that protects API calls from cascading failures.
 * Tracks consecutive failures and short-circuits requests when the
 * failure threshold is reached, allowing the system to recover.
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = "CLOSED";
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /** Returns the current circuit state. */
  getState(): CircuitState {
    return this.state;
  }

  /** Returns the current consecutive failure count. */
  getFailures(): number {
    return this.failures;
  }

  private reset(): void {
    this.failures = 0;
    this.state = "CLOSED";
    this.config.onClose?.();
  }

  /**
   * Executes an async function through the circuit breaker.
   * Throws CircuitBreakerOpenError immediately if the circuit is OPEN
   * and the reset timeout has not elapsed. On success in HALF_OPEN state,
   * resets the circuit to CLOSED.
   *
   * @param fn - The async operation to protect.
   * @throws {CircuitBreakerOpenError} If the circuit is OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.config.onHalfOpen?.();
      } else {
        throw new CircuitBreakerOpenError(
          this.config.resetTimeoutMs - (Date.now() - this.lastFailureTime)
        );
      }
    }

    try {
      const result = await fn();
      if (this.state === "HALF_OPEN") {
        this.reset();
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.config.failureThreshold) {
        this.state = "OPEN";
        this.config.onOpen?.();
      }
      throw error;
    }
  }

  /** Manually forces the circuit into the OPEN state. */
  forceOpen(): void {
    this.state = "OPEN";
    this.lastFailureTime = Date.now();
  }

  /** Manually resets the circuit to the CLOSED state. */
  forceClose(): void {
    this.reset();
  }
}

/**
 * Thrown when a request is rejected because the circuit breaker is OPEN.
 * Contains the remaining time to wait before retrying.
 */
export class CircuitBreakerOpenError extends Error {
  /** Milliseconds remaining until the circuit transitions to HALF_OPEN. */
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(
      `Circuit breaker is open — retry after ${Math.ceil(retryAfterMs / 1000)}s`
    );
    this.name = "CircuitBreakerOpenError";
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
