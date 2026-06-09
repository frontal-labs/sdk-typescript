/**
 * Default base URL for the Frontal API
 */
export const DEFAULT_BASE_URL = "https://api.frontal.dev/v1";

/**
 * API key prefix for Frontal API
 */
export const API_KEY_PREFIX = "frt_";

/**
 * Available backoff strategies for retry attempts.
 * - 'exponential': Delay increases exponentially (2^n)
 * - 'linear': Delay increases linearly (n * baseDelay)
 * - 'constant': Delay stays constant (baseDelay)
 */
export const BACKOFF_STRATEGIES = [
  "exponential",
  "linear",
  "constant",
] as const;

/**
 * Default HTTP status codes that should trigger retry attempts.
 * Includes rate limiting (429) and server errors (5xx).
 */
export const DEFAULT_RETRY_ON = [429, 500, 502, 503, 504];

/**
 * Base multiplier for exponential backoff calculations.
 */
export const EXPONENTIAL_BASE = 2;

/**
 * Maximum jitter (in milliseconds) to add to retry delays.
 * Helps prevent thundering herd problems.
 */
export const JITTER_MAX = 200;

/**
 * SDK version string sent in the X-Frontal-Core header.
 */
export const SDK_VERSION = "1.0.1";
