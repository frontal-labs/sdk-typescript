import type { z } from "zod";
import { type ErrorField, errorResponseSchema } from "./schemas";

type ErrorResponseInput = z.infer<typeof errorResponseSchema>;

export class FrontalError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly statusCode: number;
  readonly docs?: string;

  constructor(response: ErrorResponseInput, statusCode: number) {
    super(response.message);
    this.name = "FrontalError";
    this.code = response.code;
    this.requestId = response.requestId;
    this.statusCode = statusCode;
    this.docs = response.docs;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this);
    }
  }
}

export class NotFoundError extends FrontalError {
  constructor(r: ErrorResponseInput) {
    super(r, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends FrontalError {
  constructor(r: ErrorResponseInput) {
    super(r, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends FrontalError {
  constructor(r: ErrorResponseInput) {
    super(r, 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends FrontalError {
  readonly fields: ErrorField[];
  constructor(r: ErrorResponseInput) {
    super(r, 400);
    this.name = "ValidationError";
    this.fields = r.fields ?? [];
  }
}

export class ConflictError extends FrontalError {
  constructor(r: ErrorResponseInput) {
    super(r, 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends FrontalError {
  readonly retryAfter: number;
  constructor(r: ErrorResponseInput, retryAfter: number) {
    super(r, 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ServiceError extends FrontalError {
  constructor(r: ErrorResponseInput, status: number) {
    super(r, status);
    this.name = "ServiceError";
  }
}

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

export function parseFrontalError(
  body: unknown,
  status: number,
  retryAfter?: string
): FrontalError {
  const normalized = normalizeErrorBody(body);

  switch (status) {
    case 400:
      return new ValidationError(normalized);
    case 401:
      return new UnauthorizedError(normalized);
    case 403:
      return new ForbiddenError(normalized);
    case 404:
      return new NotFoundError(normalized);
    case 409:
      return new ConflictError(normalized);
    case 429: {
      const parsedRetry = retryAfter ? Number.parseInt(retryAfter, 10) : NaN;
      return new RateLimitError(
        normalized,
        Number.isFinite(parsedRetry) ? parsedRetry : 60
      );
    }
    default:
      return new ServiceError(normalized, status);
  }
}
