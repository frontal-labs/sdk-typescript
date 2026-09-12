/**
 * @frontal-labs/core
 *
 * Foundational primitives for the Frontal TypeScript SDK.
 */

export type { CircuitBreakerConfig, CircuitState } from "./circuit-breaker";
// Circuit breaker
export { CircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker";
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
export type { RateLimitInfo, SdkError, SerializedFrontalError } from "./errors";
// Error handling
export {
  ConflictError,
  ForbiddenError,
  FrontalError,
  isFrontalError,
  isRetryableError,
  NetworkError,
  NotFoundError,
  parseFrontalError,
  RateLimitError,
  ServiceError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
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
// Retry logic
export { calculateDelay } from "./retry";
// Route builder utility
export { route } from "./route-builder";
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
export type { SseEvent, StreamOptions, StreamPart } from "./stream";
// Streaming parts (errors as data)
export { dataParts, toSdkError, toStreamParts } from "./stream";
export type { ChatToolSpec, ToolCall, ToolDefinition, ToolSet } from "./tools";
// Shared tool definitions (ai + agents)
export { parseToolInput, tool, toolSetToRequest } from "./tools";
export type {
  SpanLike,
  TelemetryEvent,
  TelemetryProvider,
  TracerLike,
} from "./tracing";
export {
  createHttpSpan,
  finishSpan,
  getTelemetry,
  getTracer,
  initTracing,
  registerTelemetry,
  requestIdOf,
  resetTelemetry,
  tagRequestId,
} from "./tracing";
export type { RawValue } from "./transform";
// Key case transformation
export {
  camelToSnake,
  deepCamelToSnake,
  deepSnakeToCamel,
  raw,
  snakeToCamel,
} from "./transform";
// Core types and interfaces
export type {
  APIResponse,
  PageResult,
  QueryBuilder,
} from "./types";
