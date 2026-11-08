import { FrontalError as BaseFrontalError } from "@frontal-labs/error";
import { parseErrorResponseData } from "@frontal-labs/error/client";
import type { z } from "zod";
import { isObjectRecord } from "./guards";
import { parseRetryAfterMs } from "./retry";
import {
  type ErrorField,
  errorFieldSchema,
  errorResponseSchema,
} from "./schemas";

type ErrorResponseInput = z.infer<typeof errorResponseSchema>;

const FRONTAL_ERROR_BRAND: unique symbol = Symbol.for("frontal.error");

/** Error scope shared by every SDK-raised error. */
const SDK_SCOPE = "frontal";

/** Code used when the response carries no usable code. */
const UNKNOWN_CODE = "UNKNOWN_ERROR";

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
 * and optional rate-limit information. Extends the shared
 * `@frontal-labs/error` base class, so `errorResponse()` and the library's
 * `isFrontalError` accept it.
 */
export class FrontalError extends BaseFrontalError<string> {
  /** Brand so core's `isFrontalError` works across duplicated module instances. */
  readonly [FRONTAL_ERROR_BRAND] = true;
  declare readonly code: string;
  declare readonly statusCode: number;
  /** Request id from the response, or `"unknown"` when absent. */
  declare requestId: string;
  readonly rateLimit?: RateLimitInfo | undefined;
  /**
   * Whether retrying the same request may succeed (rate limits, transient
   * 5xx, network). UIs and agents can branch on this without a status table.
   */
  readonly retryable: boolean;

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
    // Constructing an error must never throw while another failure is being
    // handled, so out-of-range statuses and blank codes are normalized here.
    const status = toErrorStatus(statusCode);
    const code = response.code.trim().length > 0 ? response.code : UNKNOWN_CODE;
    const fix = fixFor(code, statusCode);
    super(response.message, {
      scope: SDK_SCOPE,
      code,
      statusCode: status,
      requestId: response.requestId,
      ...(response.docs === undefined ? {} : { link: response.docs }),
      ...(fix === undefined ? {} : { fix }),
      ...(status === statusCode ? {} : { metadata: { rawStatus: statusCode } }),
    });
    this.name = "FrontalError";
    this.rateLimit = rateLimit;
    this.retryable = RETRYABLE_STATUS.has(statusCode);
  }

  /** Back-compat alias for the base class's `link`. */
  get docs(): string | undefined {
    return this.link;
  }

  override toString(): string {
    return nativeToString.call(this);
  }

  /**
   * Structural `instanceof`: true for any `FrontalError` (or subclass), even
   * when two copies of `@frontal-labs/core` are loaded.
   */
  static isInstance(error: unknown): error is FrontalError {
    return isFrontalError(error);
  }

  /**
   * JSON-safe view (useful for logging and for streaming errors as data).
   * Keeps the SDK's wire shape; the base class's `toJSON()` also includes the
   * stack and metadata, which must not reach the wire. Use `serializeFailure()`
   * from `@frontal-labs/error` for diagnostics.
   */
  override toJSON(): SerializedFrontalError {
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
// biome-ignore lint/style/useConsistentTypeDefinitions: a type alias is assignable to the base `Record<string, unknown>` return type; an interface is not
export type SerializedFrontalError = {
  name: string;
  code: string;
  message: string;
  requestId: string;
  statusCode: number;
  retryable: boolean;
  docs?: string | undefined;
  fix?: string | undefined;
};

/**
 * Keeps `String(error)` as the native `Name: message` form. The base class
 * renders a multi-line developer frame, which would change logs for consumers.
 */
function nativeToString(this: Error): string {
  return Error.prototype.toString.call(this);
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Clamp to the 400–599 range the base class's `errorResponse()` accepts. */
function toErrorStatus(status: number): number {
  return Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : 500;
}

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
    FRONTAL_ERROR_BRAND in error &&
    error[FRONTAL_ERROR_BRAND] === true
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
  static override isInstance = byName<NotFoundError>("NotFoundError");
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 404, rateLimit);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when the API returns a 401 status.
 */
export class UnauthorizedError extends FrontalError {
  static override isInstance = byName<UnauthorizedError>("UnauthorizedError");
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 401, rateLimit);
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when the API returns a 403 status.
 */
export class ForbiddenError extends FrontalError {
  static override isInstance = byName<ForbiddenError>("ForbiddenError");
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 403, rateLimit);
    this.name = "ForbiddenError";
  }
}

/**
 * Thrown when the API returns a 400 status with field-level validation details.
 */
export class ValidationError extends FrontalError {
  static override isInstance = byName<ValidationError>("ValidationError");
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
  static override isInstance = byName<ConflictError>("ConflictError");
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 409, rateLimit);
    this.name = "ConflictError";
  }
}

/**
 * Thrown when the API returns a 412 status: a conditional request (for example
 * `If-Match`) did not match the stored resource. The resource was changed by
 * someone else, so re-read it and try again.
 */
export class PreconditionFailedError extends FrontalError {
  static override isInstance = byName<PreconditionFailedError>(
    "PreconditionFailedError"
  );
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 412, rateLimit);
    this.name = "PreconditionFailedError";
  }
}

/**
 * Thrown when the API returns a 429 status (rate limited).
 */
export class RateLimitError extends FrontalError {
  static override isInstance = byName<RateLimitError>("RateLimitError");
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
 * Thrown when the API returns a 402 status (the account's balance or plan
 * does not cover the request). Callers can branch on this to top up or fall
 * back.
 */
export class PaymentRequiredError extends FrontalError {
  static override isInstance = byName<PaymentRequiredError>(
    "PaymentRequiredError"
  );
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 402, rateLimit);
    this.name = "PaymentRequiredError";
  }
}

/**
 * Thrown when the API returns a 413 status (the request body is too large).
 */
export class PayloadTooLargeError extends FrontalError {
  static override isInstance = byName<PayloadTooLargeError>(
    "PayloadTooLargeError"
  );
  constructor(r: ErrorResponseInput, rateLimit?: RateLimitInfo) {
    super(r, 413, rateLimit);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Thrown when the API returns a 5xx status code.
 */
export class ServiceError extends FrontalError {
  static override isInstance = byName<ServiceError>("ServiceError");
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
export class NetworkError extends BaseFrontalError<string> {
  /** Stable code so `SdkError` is uniform: every error has a `code`. */
  declare readonly code: "NETWORK_ERROR";
  /** Always true: the request never reached the API, so it is safe to retry. */
  readonly retryable = true;
  /** Undefined — no response means no server-issued request id. */
  declare readonly requestId?: string;
  declare readonly fix: string;
  constructor(cause: unknown) {
    super("Network error — could not reach Frontal API", {
      scope: SDK_SCOPE,
      code: "NETWORK_ERROR",
      fix: "Check network connectivity and FRONTAL_API_URL; the request never reached the API.",
      cause,
    });
    this.name = "NetworkError";
  }

  static isInstance(error: unknown): error is NetworkError {
    return error instanceof Error && error.name === "NetworkError";
  }

  override toString(): string {
    return nativeToString.call(this);
  }

  /** Same wire shape as before the base class; `cause` is never serialized. */
  override toJSON(): SerializedTransportError {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      fix: this.fix,
    };
  }
}

/**
 * Thrown when an operation exceeds a time limit.
 */
export class TimeoutError extends BaseFrontalError<string> {
  declare readonly code: "TIMEOUT";
  /** Timeouts are transient by nature. */
  readonly retryable = true;
  declare readonly requestId?: string;
  declare readonly fix: string;
  constructor(message = "Operation timed out") {
    super(message, {
      scope: SDK_SCOPE,
      code: "TIMEOUT",
      fix: "Increase `timeout` in the client config or reduce the work per request.",
    });
    this.name = "TimeoutError";
  }

  static isInstance(error: unknown): error is TimeoutError {
    return error instanceof Error && error.name === "TimeoutError";
  }

  override toString(): string {
    return nativeToString.call(this);
  }

  /** Same wire shape as before the base class. */
  override toJSON(): SerializedTransportError {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      fix: this.fix,
    };
  }
}

/** Plain-object form of a {@link NetworkError} or {@link TimeoutError}. */
// biome-ignore lint/style/useConsistentTypeDefinitions: a type alias is assignable to the base `Record<string, unknown>` return type; an interface is not
export type SerializedTransportError = {
  name: string;
  code: string;
  message: string;
  retryable: boolean;
  fix: string;
};

/** Any error the SDK can surface from a request or stream. */
export type SdkError = FrontalError | NetworkError | TimeoutError;

/**
 * True if the error is transient and the same call may succeed on retry.
 * Works for `FrontalError`, `NetworkError`, `TimeoutError`, and plain errors
 * (which are never retryable).
 */
export function isRetryableError(error: unknown): boolean {
  if (!isObjectRecord(error)) return false;
  const { retryable } = error;
  return retryable === true;
}

/**
 * The gateway's nested envelope, `{"error":{code,message,...}}`, parsed by the
 * shared library. When the library rejects the envelope (for example, no
 * `code`), the message is still kept, with `UNKNOWN_ERROR` as the code.
 */
function fromNestedEnvelope(body: unknown): ErrorResponseInput | undefined {
  if (!isObjectRecord(body)) return undefined;
  const { error: detail, requestId: camelId, request_id: snakeId } = body;
  if (!isObjectRecord(detail)) return undefined;
  const requestId =
    typeof camelId === "string" && camelId.length > 0
      ? camelId
      : typeof snakeId === "string" && snakeId.length > 0
        ? snakeId
        : "unknown";

  const parsed = parseErrorResponseData(body)?.error;
  if (parsed !== undefined) {
    return {
      code: parsed.code ?? UNKNOWN_CODE,
      message: parsed.message,
      requestId,
      docs: parsed.link,
    };
  }

  const { code: innerCode, message: innerMessage } = detail;
  if (typeof innerMessage !== "string") return undefined;
  return {
    code:
      typeof innerCode === "string" && innerCode.length > 0
        ? innerCode
        : UNKNOWN_CODE,
    message: innerMessage,
    requestId,
  };
}

function normalizeErrorBody(raw: unknown): ErrorResponseInput {
  const nested = fromNestedEnvelope(raw);
  if (nested !== undefined) return nested;

  const body = raw;
  const parsed = errorResponseSchema.safeParse(body);
  if (parsed.success) return parsed.data;

  const fallback: Record<string, unknown> = isObjectRecord(body) ? body : {};
  const { code: rawCode, detail: rawDetail, message: rawMessage } = fallback;
  const {
    requestId: rawRequestId,
    docs: rawDocs,
    fields: rawFields,
  } = fallback;

  const hasExplicitCode = typeof rawCode === "string" && rawCode.length > 0;
  const code = hasExplicitCode ? rawCode : UNKNOWN_CODE;

  // Ontology routes answer `{ detail }` (FastAPI style). Use it as the message
  // so 404/422 errors keep their reason; the code stays UNKNOWN_ERROR.
  const detail =
    typeof rawDetail === "string" && rawDetail.length > 0
      ? rawDetail
      : undefined;
  const explicitMessage =
    typeof rawMessage === "string" && rawMessage.length > 0
      ? rawMessage
      : undefined;
  // A message is trusted only with an explicit code. Otherwise `detail`
  // (the ontology API's text) is used, and the generic text is the last resort.
  const message =
    hasExplicitCode && explicitMessage !== undefined
      ? explicitMessage
      : (detail ?? "An unknown error occurred");

  // Each field entry is kept only when it matches the error-field schema, so a
  // malformed entry cannot reach consumers typed as `ErrorField`. Valid entries
  // are kept even when a neighbour is malformed.
  const fields = Array.isArray(rawFields)
    ? rawFields.flatMap((entry: unknown) => {
        const parsedField = errorFieldSchema.safeParse(entry);
        return parsedField.success ? [parsedField.data] : [];
      })
    : undefined;

  return {
    code,
    message,
    requestId:
      typeof rawRequestId === "string" && rawRequestId.length > 0
        ? rawRequestId
        : "unknown",
    docs: typeof rawDocs === "string" ? rawDocs : undefined,
    fields,
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
    case 412:
      return new PreconditionFailedError(normalized, rateLimit);
    case 402:
      return new PaymentRequiredError(normalized, rateLimit);
    case 413:
      return new PayloadTooLargeError(normalized, rateLimit);
    case 429: {
      const retryAfterMs = parseRetryAfterMs(retryAfter);
      return new RateLimitError(
        normalized,
        retryAfterMs === undefined ? 60 : retryAfterMs / 1000,
        rateLimit
      );
    }
    default:
      return new ServiceError(normalized, status, rateLimit);
  }
}
