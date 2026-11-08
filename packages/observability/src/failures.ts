import { describeSdkError, type SdkErrorDiagnostics } from "@frontal-labs/core";

/** Anything with an `error` method, such as `console` or a structured logger. */
export interface SdkFailureLogger {
  error(message: string, record: SdkErrorDiagnostics): void;
}

/**
 * Logs an SDK failure as redacted diagnostics: `scope/code` fingerprint,
 * status, request id and metadata, with API keys replaced by `[REDACTED]`.
 * Never logs the raw error, whose `cause` and `stack` can hold secrets.
 *
 * @returns The record that was logged, so callers can also attach it to a trace.
 *
 * @example
 * ```ts
 * import { logSdkFailure } from "@frontal-labs/observability";
 * try {
 *   await client.get("/something");
 * } catch (error) {
 *   logSdkFailure(error);
 *   throw error;
 * }
 * ```
 */
export function logSdkFailure(
  error: unknown,
  logger: SdkFailureLogger = console
): SdkErrorDiagnostics {
  const record = describeSdkError(error);
  logger.error("[frontal] SDK failure", record);
  return record;
}
