/**
 * @frontal-labs/core
 *
 * Foundational primitives for the Frontal TypeScript SDK.
 */

export { FrontalClient, getDefaultClient } from "./client";
export type { ClientConfigInput, ClientConfigOutput } from "./config";
// Configuration schemas
export { clientConfigSchema } from "./config";
// Constants
export {
  API_KEY_PREFIX,
  BACKOFF_STRATEGIES,
  DEFAULT_BASE_URL,
  DEFAULT_RETRY_ON,
  EXPONENTIAL_BASE,
  JITTER_MAX,
} from "./constants";
// Error handling
export {
  ConflictError,
  ForbiddenError,
  FrontalError,
  NetworkError,
  NotFoundError,
  parseFrontalError,
  RateLimitError,
  ServiceError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
export type { RateLimitInfo } from "./errors";
// HTTP client for API requests
export { HttpClient } from "./http";
// Environment variable management
export { env } from "./keys";
// Pagination utilities
export {
  asPagePayload,
  createPageResult,
  pageResultSchema,
} from "./pagination";
export type { PollOptions } from "./polling";
// Polling utilities
export { pollUntil, withTimeout } from "./polling";
// Key case transformation
export {
  camelToSnake,
  deepCamelToSnake,
  deepSnakeToCamel,
  snakeToCamel,
} from "./transform";
// Retry logic
export { calculateDelay } from "./retry";

// Circuit breaker
export { CircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker";
export type { CircuitBreakerConfig, CircuitState } from "./circuit-breaker";

export type {
  ErrorField,
  ErrorResponse,
  FilterConditions,
  FilterValue,
  PaginationMeta,
  ResponseMeta,
  RetryConfig,
} from "./schemas";
// Schema validation and types
export {
  errorFieldSchema,
  errorResponseSchema,
  filterConditionsSchema,
  filterValueSchema,
  paginationMetaSchema,
  responseMetaSchema,
  retryConfigSchema,
  timestampSchema,
} from "./schemas";
// Route builder utility
export { route } from "./route-builder";

// Core types and interfaces
export type {
  APIResponse,
  PageResult,
  QueryBuilder,
} from "./types";

export { getTracer, initTracing, createHttpSpan, finishSpan } from "./tracing";
export type { TracerLike, SpanLike } from "./tracing";
