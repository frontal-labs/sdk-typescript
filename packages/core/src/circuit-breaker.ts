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
  private probeInFlight = false;
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
   * resets the circuit to CLOSED. A result classifier can count returned HTTP
   * error responses as failures too.
   *
   * @param fn - The async operation to protect.
   * @param isFailure - Optional predicate for failure-shaped results.
   * @throws {CircuitBreakerOpenError} If the circuit is OPEN.
   */
  async execute<T>(
    fn: () => Promise<T>,
    isFailure: (result: T) => boolean = () => false
  ): Promise<T> {
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

    const isProbe = this.state === "HALF_OPEN";
    if (isProbe) {
      if (this.probeInFlight) {
        throw new CircuitBreakerOpenError(this.config.resetTimeoutMs);
      }
      this.probeInFlight = true;
    }

    try {
      const result = await fn();
      if (isFailure(result)) {
        this.recordFailure(isProbe);
      } else if (isProbe) {
        this.reset();
      } else {
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.recordFailure(isProbe);
      throw error;
    } finally {
      if (isProbe) this.probeInFlight = false;
    }
  }

  private recordFailure(isProbe: boolean): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (isProbe || this.failures >= this.config.failureThreshold) {
      const wasOpen = this.state === "OPEN";
      this.state = "OPEN";
      if (!wasOpen) this.config.onOpen?.();
    }
  }

  /** Manually forces the circuit into the OPEN state. */
  forceOpen(): void {
    this.state = "OPEN";
    this.lastFailureTime = Date.now();
    this.probeInFlight = false;
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
