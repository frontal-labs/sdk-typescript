import { EXPONENTIAL_BASE, JITTER_MAX } from "./constants";
import type { RetryConfig } from "./schemas";

type BackoffStrategy = "exponential" | "linear" | "constant";

interface LegacyRetryConfig {
  retryDelay: number;
  backoff: BackoffStrategy;
  maxRetries?: number;
  retryOn?: number[];
}

function computeBaseDelay(
  attempt: number,
  strategy: BackoffStrategy,
  baseDelay: number
): number {
  const normalizedAttempt = Math.floor(attempt);
  switch (strategy) {
    case "linear":
      return Math.max(0, baseDelay * (normalizedAttempt + 1));
    case "constant":
      return baseDelay;
    default:
      return baseDelay * EXPONENTIAL_BASE ** normalizedAttempt;
  }
}

/**
 * Supports two call signatures:
 * - calculateDelay(attempt, strategy, baseDelay, withJitter?)
 * - calculateDelay(attempt, retryConfig)
 */
export function calculateDelay(
  attempt: number,
  strategyOrConfig: BackoffStrategy | RetryConfig | LegacyRetryConfig,
  baseDelay?: number,
  withJitter = false
): number {
  if (typeof strategyOrConfig === "object") {
    const strategy =
      "strategy" in strategyOrConfig
        ? strategyOrConfig.strategy
        : strategyOrConfig.backoff;
    const delayBase =
      "baseDelay" in strategyOrConfig
        ? strategyOrConfig.baseDelay
        : strategyOrConfig.retryDelay;

    const delay = computeBaseDelay(attempt, strategy, delayBase);
    const shouldJitter =
      "jitter" in strategyOrConfig ? Boolean(strategyOrConfig.jitter) : true;
    if (!shouldJitter) return delay;
    return delay + Math.random() * (JITTER_MAX / 2);
  }

  const delay = computeBaseDelay(
    attempt,
    strategyOrConfig,
    Math.max(0, baseDelay ?? 0)
  );
  if (!withJitter) return delay;
  return delay + Math.random() * (JITTER_MAX / 2);
}
