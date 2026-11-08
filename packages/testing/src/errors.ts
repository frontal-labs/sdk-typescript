import { isRetryableError } from "@frontal-labs/core";

/** Options for {@link mockError}. */
export interface MockErrorOptions {
  /** HTTP status of the response (400–599). Defaults to 500. */
  status?: number;
  /** Stable error code the gateway returns. Defaults to `UNKNOWN_ERROR`. */
  code?: string;
  /** Developer message. Defaults to `"mock error"`. */
  message?: string;
  /** Request id, sent in the body and the `x-request-id` header. */
  requestId?: string;
}

/**
 * Builds a `Response` with the same nested error envelope the Frontal gateway
 * returns, so tests exercise the real parsing path rather than hand-written
 * flat bodies.
 *
 * @example
 * ```ts
 * const fetch = createMockFetch([
 *   { path: "/v1/things", method: "GET", response: () => mockError({ status: 404, code: "NOT_FOUND" }) },
 * ]);
 * ```
 */
export function mockError(options: MockErrorOptions = {}): Response {
  const status = options.status ?? 500;
  const requestId = options.requestId ?? "req_mock";
  const body = {
    error: {
      scope: "frontal",
      code: options.code ?? "UNKNOWN_ERROR",
      message: options.message ?? "mock error",
    },
    requestId,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
    },
  });
}

/** Expected properties for {@link expectFrontalError}. Omitted keys are not checked. */
export interface ExpectedFrontalError {
  code?: string;
  statusCode?: number;
  retryable?: boolean;
}

/** Throws a descriptive error when `actual` differs from `expected`. */
function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

/**
 * Asserts that `error` is an SDK error with the given `code`, `statusCode`
 * and `retryable` flag. Branches on the code, never on the message. Throws a
 * descriptive error on mismatch, so it works inside any test runner.
 */
export function expectFrontalError(
  error: unknown,
  expected: ExpectedFrontalError
): void {
  if (typeof error !== "object" || error === null) {
    throw new Error(`Expected an SDK error object, got ${typeof error}`);
  }
  const fields = error as { code?: unknown; statusCode?: unknown };
  if (expected.code !== undefined) {
    assertEqual("code", fields.code, expected.code);
  }
  if (expected.statusCode !== undefined) {
    assertEqual("statusCode", fields.statusCode, expected.statusCode);
  }
  if (expected.retryable !== undefined) {
    assertEqual("retryable", isRetryableError(error), expected.retryable);
  }
}
