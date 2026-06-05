export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = "CLOSED";
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  private reset(): void {
    this.failures = 0;
    this.state = "CLOSED";
    this.config.onClose?.();
  }

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

  forceOpen(): void {
    this.state = "OPEN";
    this.lastFailureTime = Date.now();
  }

  forceClose(): void {
    this.reset();
  }
}

export class CircuitBreakerOpenError extends Error {
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
