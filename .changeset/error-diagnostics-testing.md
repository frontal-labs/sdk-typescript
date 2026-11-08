---
"@frontal-labs/core": minor
"@frontal-labs/observability": minor
"@frontal-labs/testing": minor
---

Error diagnostics, boundary attributes, and test helpers.

- `CircuitBreakerOpenError` extends the shared base class with code `CIRCUIT_OPEN`. It is retryable, so `isRetryableError()` is true. `instanceof` checks still hold.
- HTTP errors carry `attributes` with `http.status_code` and `frontal.request_id`.
- The configured `logger.error` receives redacted diagnostics for API errors. Under `debug`, the same record is printed with `console.error`.
- `logSdkFailure(error, logger?)` in `@frontal-labs/observability` logs a redacted record with a `scope/code` fingerprint.
- `mockError()` and `expectFrontalError()` in `@frontal-labs/testing` build gateway-shaped error responses and assert on code, status and retryability.
