import {
  FrontalError as BaseFrontalError,
  createErrors,
  type FrontalErrorOptions,
} from "@frontal-labs/error";
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
        throw circuitErrors.create("Circuit breaker is open", {
          code: "CIRCUIT_OPEN",
          metadata: {
            retryAfterMs:
              this.config.resetTimeoutMs - (Date.now() - this.lastFailureTime),
          },
        });
      }
    }

    const isProbe = this.state === "HALF_OPEN";
    if (isProbe) {
      if (this.probeInFlight) {
        throw circuitErrors.create("Circuit breaker is open", {
          code: "CIRCUIT_OPEN",
          metadata: { retryAfterMs: this.config.resetTimeoutMs },
        });
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
 * Retryable once the reset window has passed, so `isRetryableError()` is true.
 *
 * Accepts the retry window in milliseconds (the original signature), or a
 * message with options. The second form is the one `createErrors` calls, so
 * `circuitErrors.create()` returns real `CircuitBreakerOpenError` instances and
 * `instanceof` keeps working.
 */
export class CircuitBreakerOpenError extends BaseFrontalError<"CIRCUIT_OPEN"> {
  /** Milliseconds remaining until the circuit transitions to HALF_OPEN. */
  readonly retryAfterMs: number;
  declare readonly code: "CIRCUIT_OPEN";
  readonly retryable = true;
  declare readonly fix: string;

  constructor(
    retryAfterOrMessage: number | string,
    options: FrontalErrorOptions<"CIRCUIT_OPEN"> = {}
  ) {
    const fromWindow = typeof retryAfterOrMessage === "number";
    const { retryAfterMs: suppliedMs } = options.metadata ?? {};
    const retryAfterMs = fromWindow
      ? retryAfterOrMessage
      : typeof suppliedMs === "number"
        ? suppliedMs
        : 0;
    const message = fromWindow
      ? `Circuit breaker is open — retry after ${Math.ceil(retryAfterMs / 1000)}s`
      : retryAfterOrMessage;
    const { code = "CIRCUIT_OPEN", fix, metadata, ...rest } = options;
    super(message, {
      ...rest,
      scope: "frontal",
      code,
      fix:
        fix ??
        "Wait for the reset window to pass, or check the upstream failures that opened the circuit.",
      metadata: { ...metadata, retryAfterMs },
    });
    this.name = "CircuitBreakerOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** Factory the breaker throws through: same class, same `CIRCUIT_OPEN` code. */
const circuitErrors = createErrors({
  scope: "frontal",
  ErrorClass: CircuitBreakerOpenError,
});
