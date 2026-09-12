import type { z } from "zod";
import { type ErrorField, errorResponseSchema } from "./schemas";

type ErrorResponseInput = z.infer<typeof errorResponseSchema>;

const FRONTAL_ERROR_BRAND: unique symbol = Symbol.for("frontal.error");

/**
 * Rate-limit metadata returned in API response headers.
 */
export interface RateLimitInfo {
  /** Maximum number of requests allowed in the current window. */
  limit: number;
  /** Number of requests remaining in the current window. */
  remaining: number;
  /** Unix timestamp (seconds) when the rate-limit window resets. */
  reset: number;
}

/**
 * Base error class for all Frontal API errors.
 * Contains the error code, request ID, HTTP status code, optional docs URL,
 * and optional rate-limit information.
 */
export class FrontalError extends Error {
  /** Brand so `isInstance` works across duplicated module instances. */
  readonly [FRONTAL_ERROR_BRAND] = true;
  readonly code: string;
  readonly requestId: string;
  readonly statusCode: number;
  readonly docs?: string;
  readonly rateLimit?: RateLimitInfo;
  /**
   * Whether retrying the same request may succeed (rate limits, transient
   * 5xx, network). UIs and agents can branch on this without a status table.
   */
  readonly retryable: boolean;
  /**
   * Human-readable next step, when the SDK knows one
   * (e.g. "Set FRONTAL_API_KEY to a key starting with frt_").
   */
  readonly fix?: string;

  /**
   * @param response - The parsed error response from the API.
   * @param statusCode - The HTTP status code.
   * @param rateLimit - Optional rate-limit headers from the response.
   */
  constructor(
    response: ErrorResponseInput,
    statusCode: number,
    rateLimit?: RateLimitInfo
  ) {
    super(response.message);
    this.name = "FrontalError";
    this.code = response.code;
    this.requestId = response.requestId;
    this.statusCode = statusCode;
    this.docs = response.docs;
    this.rateLimit = rateLimit;
    this.retryable = RETRYABLE_STATUS.has(statusCode);
    this.fix = fixFor(response.code, statusCode);
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this);
    }
  }

  /**
   * Structural `instanceof`: true for any `FrontalError` (or subclass), even
   * when two copies of `@frontal-labs/core` are loaded.
   */
  static isInstance(error: unknown): error is FrontalError {
    return isFrontalError(error);
  }

  /** JSON-safe view (useful for logging and for streaming errors as data). */
  toJSON(): SerializedFrontalError {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      statusCode: this.statusCode,
      retryable: this.retryable,
      docs: this.docs,
      fix: this.fix,
    };
  }
}

/** Plain-object form of a {@link FrontalError}, as produced by `toJSON()`. */
export interface SerializedFrontalError {
  name: string;
  code: string;
  message: string;
  requestId: string;
  statusCode: number;
  retryable: boolean;
  docs?: string;
  fix?: string;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Suggested remediation by error code / status. Keep terse and actionable. */
function fixFor(code: string, status: number): string | undefined {
  switch (code) {
    case "UNAUTHORIZED":
    case "INVALID_API_KEY":
      return "Check FRONTAL_API_KEY — it must be a valid key starting with frt_.";
    case "RATE_LIMITED":
      return "Back off and retry after the `retryAfter` interval, or lower request concurrency.";
    case "NOT_FOUND":
      return "Verify the resource id and that it belongs to this workspace/environment.";
    case "VALIDATION_ERROR":
      return "Inspect `fields` for the offending properties and fix the request payload.";
    default:
      break;
  }
  switch (status) {
    case 401:
      return "Check FRONTAL_API_KEY — it must be a valid key starting with frt_.";
    case 403:
      return "The key lacks permission for this action; check roles/policies in governance.";
    case 429:
      return "Back off and retry after the `retryAfter` interval, or lower request concurrency.";
    case 503:
      return "Service is temporarily unavailable; retry with backoff.";
    default:
      return undefined;
  }
}

/** Free-function form of {@link FrontalError.isInstance}. */
export function isFrontalError(error: unknown): error is FrontalError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Record<symbol, unknown>)[FRONTAL_ERROR_BRAND] === true
  );
}

function byName<T extends FrontalError>(name: string) {
  return (error: unknown): error is T =>
    isFrontalError(error) && error.name === name;
}

/**
 * Thrown when the API returns a 404 status.
 */
export class NotFoundError extends FrontalError {
  static isInstance = byName<NotFoundError>("NotFoundError");
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 404, rateLimit);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when the API returns a 401 status.
 */
export class UnauthorizedError extends FrontalError {
  static isInstance = byName<UnauthorizedError>("UnauthorizedError");
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 401, rateLimit);
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when the API returns a 403 status.
 */
export class ForbiddenError extends FrontalError {
  static isInstance = byName<ForbiddenError>("ForbiddenError");
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 403, rateLimit);
    this.name = "ForbiddenError";
  }
}

/**
 * Thrown when the API returns a 400 status with field-level validation details.
 */
export class ValidationError extends FrontalError {
  static isInstance = byName<ValidationError>("ValidationError");
  /** Per-field validation errors returned by the API. */
  readonly fields: ErrorField[];
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 400, rateLimit);
    this.name = "ValidationError";
    this.fields = r.fields ?? [];
  }
}

/**
 * Thrown when the API returns a 409 status (resource conflict).
 */
export class ConflictError extends FrontalError {
  static isInstance = byName<ConflictError>("ConflictError");
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 409, rateLimit);
    this.name = "ConflictError";
  }
}

/**
 * Thrown when the API returns a 429 status (rate limited).
 */
export class RateLimitError extends FrontalError {
  static isInstance = byName<RateLimitError>("RateLimitError");
  /** Recommended delay in seconds before retrying. */
  readonly retryAfter: number;
  constructor(
    r: ErrorResponseInput,
    retryAfter: number,
    rateLimit?: RateLimitInfo
  ) {
    super(r, 429, rateLimit);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when the API returns a 5xx status code.
 */
export class ServiceError extends FrontalError {
  static isInstance = byName<ServiceError>("ServiceError");
  constructor(
    r: ErrorResponseInput,
    status: number,
    rateLimit?: RateLimitInfo
  ) {
    super(r, status, rateLimit);
    this.name = "ServiceError";
  }
}

/**
 * Thrown when a network-level failure prevents the request from reaching the API.
 * The original error is available via the `cause` property.
 */
export class NetworkError extends Error {
  /** Stable code so `SdkError` is uniform: every error has a `code`. */
  readonly code = "NETWORK_ERROR";
  /** Always true: the request never reached the API, so it is safe to retry. */
  readonly retryable = true;
  /** Undefined — no response means no server-issued request id. */
  readonly requestId?: string;
  readonly fix =
    "Check network connectivity and FRONTAL_API_URL; the request never reached the API.";
  constructor(readonly cause: unknown) {
    super("Network error — could not reach Frontal API");
    this.name = "NetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }

  static isInstance(error: unknown): error is NetworkError {
    return error instanceof Error && error.name === "NetworkError";
  }
}

/**
 * Thrown when an operation exceeds a time limit.
 */
export class TimeoutError extends Error {
  readonly code = "TIMEOUT";
  /** Timeouts are transient by nature. */
  readonly retryable = true;
  readonly requestId?: string;
  readonly fix =
    "Increase `timeout` in the client config or reduce the work per request.";
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static isInstance(error: unknown): error is TimeoutError {
    return error instanceof Error && error.name === "TimeoutError";
  }
}

/** Any error the SDK can surface from a request or stream. */
export type SdkError = FrontalError | NetworkError | TimeoutError;

/**
 * True if the error is transient and the same call may succeed on retry.
 * Works for `FrontalError`, `NetworkError`, `TimeoutError`, and plain errors
 * (which are never retryable).
 */
export function isRetryableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { retryable?: unknown }).retryable === true
  );
}

function normalizeErrorBody(body: unknown): ErrorResponseInput {
  const parsed = errorResponseSchema.safeParse(body);
  if (parsed.success) return parsed.data;

  const fallback =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const code =
    typeof fallback.code === "string" && fallback.code.length > 0
      ? fallback.code
      : "UNKNOWN_ERROR";
  const hasExplicitCode =
    typeof fallback.code === "string" && fallback.code.length > 0;

  const message =
    hasExplicitCode &&
    typeof fallback.message === "string" &&
    fallback.message.length > 0
      ? fallback.message
      : "An unknown error occurred";

  return {
    code,
    message,
    requestId:
      typeof fallback.requestId === "string" && fallback.requestId.length > 0
        ? fallback.requestId
        : "unknown",
    docs: typeof fallback.docs === "string" ? fallback.docs : undefined,
    fields: Array.isArray(fallback.fields)
      ? (fallback.fields as ErrorField[])
      : undefined,
  };
}

/**
 * Parses an API error response body into the appropriate FrontalError subclass
 * based on the HTTP status code. Handles malformed or unexpected payloads
 * by falling back to a generic ServiceError.
 *
 * @param body - The raw error response body (typically parsed JSON).
 * @param status - The HTTP status code.
 * @param retryAfter - Optional `Retry-After` header value.
 * @param rateLimit - Optional rate-limit headers from the response.
 * @returns The corresponding FrontalError subclass instance.
 */
export function parseFrontalError(
  body: unknown,
  status: number,
  retryAfter?: string,
  rateLimit?: RateLimitInfo
): FrontalError {
  const normalized = normalizeErrorBody(body);

  switch (status) {
    case 400:
      return new ValidationError(normalized, rateLimit);
    case 401:
      return new UnauthorizedError(normalized, rateLimit);
    case 403:
      return new ForbiddenError(normalized, rateLimit);
    case 404:
      return new NotFoundError(normalized, rateLimit);
    case 409:
      return new ConflictError(normalized, rateLimit);
    case 429: {
      const parsedRetry = retryAfter
        ? Number.parseInt(retryAfter, 10)
        : Number.NaN;
      return new RateLimitError(
        normalized,
        Number.isFinite(parsedRetry) ? parsedRetry : 60,
        rateLimit
      );
    }
    default:
      return new ServiceError(normalized, status, rateLimit);
  }
}
