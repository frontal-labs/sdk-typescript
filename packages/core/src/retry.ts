import { EXPONENTIAL_BASE, JITTER_MAX } from "./constants";
import type { RetryConfig } from "./schemas";

/**
 * Parses a `retry-after-ms` header value, which is already in milliseconds.
 * Returns `undefined` for a missing, blank, or unparseable value.
 */
export function parseRetryAfterMsHeader(
  value: string | null | undefined
): number | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

/**
 * Parses a `Retry-After` header value into milliseconds.
 *
 * Accepts a non-negative integer number of seconds or an HTTP-date. Returns
 * `undefined` for a missing, blank, or unparseable value, so the caller falls
 * back to its configured backoff. An explicit `0` is a valid zero delay.
 *
 * @param value - Raw header value.
 * @param now - Current time in ms, injectable for tests.
 */
export function parseRetryAfterMs(
  value: string | null | undefined,
  now = Date.now()
): number | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - now);
}

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
