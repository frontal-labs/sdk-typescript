/**
 * Matches a Frontal API key anywhere in a string: the current `frt_` prefix and
 * the legacy `fr_typed` prefix that `FRONTAL_API_KEY` still accepts.
 */
const API_KEY_PATTERN = /(?:frt_|fr_typed)[A-Za-z0-9_-]+/g;

/**
 * Safe, log-ready view of an SDK error. Unlike `toJSON()`, it never includes
 * `cause` or `stack`, and any API key found in a string is replaced with
 * `[REDACTED]`.
 */
export interface SdkErrorDiagnostics {
  name: string;
  code: string;
  scope?: string | undefined;
  message: string;
  statusCode?: number | undefined;
  requestId?: string | undefined;
  retryable: boolean;
  /** Stable grouping key: `scope/code`, for example `frontal/NOT_FOUND`. */
  fingerprint: string;
  metadata?: Record<string, unknown> | undefined;
}

/** Replaces every Frontal API key in `value` with `[REDACTED]`. */
export function redactSecrets(value: string): string {
  return value.replace(API_KEY_PATTERN, "[REDACTED]");
}

function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, redactDeep(inner)])
    );
  }
  return value;
}

/** `String(value)` that cannot throw, for values with no usable `toString`. */
function safeString(value: unknown): string {
  try {
    return String(value);
  } catch {
    return "[unprintable value]";
  }
}

/** Optional SDK fields read from any thrown value. */
interface SdkErrorFields {
  code?: string;
  scope?: string;
  statusCode?: number;
  requestId?: string;
  metadata?: Record<string, unknown>;
  retryable?: boolean;
}

/**
 * Builds the log-ready diagnostics for any thrown value. SDK errors carry
 * their `scope` and `code`; anything else falls back to `unscoped/<name>`, so
 * this can be called directly on a `catch` binding without a cast.
 */
export function describeSdkError(error: unknown): SdkErrorDiagnostics {
  if (!(error instanceof Error)) {
    const message = redactSecrets(safeString(error));
    return {
      name: "NonError",
      code: "UNKNOWN_ERROR",
      message,
      retryable: false,
      fingerprint: "unscoped/UNKNOWN_ERROR",
    };
  }
  const fields = error as Error & SdkErrorFields;
  const code = fields.code ?? error.name;
  const requestId = fields.requestId;
  return {
    name: error.name,
    code,
    scope: fields.scope,
    message: redactSecrets(error.message),
    statusCode: fields.statusCode,
    requestId:
      requestId === undefined || requestId === "unknown"
        ? undefined
        : redactSecrets(requestId),
    retryable: fields.retryable === true,
    fingerprint: `${fields.scope ?? "unscoped"}/${code}`,
    metadata:
      fields.metadata === undefined
        ? undefined
        : (redactDeep(fields.metadata) as Record<string, unknown>),
  };
}
