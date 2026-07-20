import type { z } from "zod";
import { type ErrorField, errorResponseSchema } from "./schemas";

type ErrorResponseInput = z.infer<typeof errorResponseSchema>;

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
  readonly code: string;
  readonly requestId: string;
  readonly statusCode: number;
  readonly docs?: string;
  readonly rateLimit?: RateLimitInfo;

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
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this);
    }
  }
}

/**
 * Thrown when the API returns a 404 status.
 */
export class NotFoundError extends FrontalError {
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 404, rateLimit);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when the API returns a 401 status.
 */
export class UnauthorizedError extends FrontalError {
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 401, rateLimit);
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when the API returns a 403 status.
 */
export class ForbiddenError extends FrontalError {
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 403, rateLimit);
    this.name = "ForbiddenError";
  }
}

/**
 * Thrown when the API returns a 400 status with field-level validation details.
 */
export class ValidationError extends FrontalError {
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
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 409, rateLimit);
    this.name = "ConflictError";
  }
}

/**
 * Thrown when the API returns a 429 status (rate limited).
 */
export class RateLimitError extends FrontalError {
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
  constructor(readonly cause: unknown) {
    super("Network error — could not reach Frontal API");
    this.name = "NetworkError";
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}

/**
 * Thrown when an operation exceeds a time limit.
 */
export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
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
