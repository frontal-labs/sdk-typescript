import type { SdkError } from "./errors";

/** Matches a Frontal API key anywhere in a string. */
const API_KEY_PATTERN = /frt_[A-Za-z0-9_-]+/g;

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

/**
 * Builds the log-ready diagnostics for an SDK error. All three SDK roots share
 * the library's base fields, so no per-class branching is needed.
 */
export function describeSdkError(error: SdkError): SdkErrorDiagnostics {
  const { name, code, scope, statusCode, requestId, metadata } = error;
  return {
    name,
    code: code ?? name,
    scope,
    message: redactSecrets(error.message),
    statusCode,
    requestId:
      requestId === undefined || requestId === "unknown"
        ? undefined
        : redactSecrets(requestId),
    retryable: error.retryable === true,
    fingerprint: `${scope ?? "unscoped"}/${code ?? name}`,
    metadata:
      metadata === undefined
        ? undefined
        : (redactDeep(metadata) as Record<string, unknown>),
  };
}
