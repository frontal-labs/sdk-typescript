---
"@frontal-labs/core": minor
---

- New `PaymentRequiredError` (HTTP 402) and `PayloadTooLargeError` (HTTP 413), so billing and body-size failures can be matched by type instead of `status`.
- `Retry-After` is parsed as seconds or an HTTP-date. Blank or malformed values fall back to the configured backoff instead of retrying immediately. Server-requested delays are capped at 60 seconds. `retry-after-ms` is honored when present. `RateLimitError.retryAfter` uses the same parser.
- Request timeouts above the 32-bit timer maximum are clamped, so long deadlines no longer fire after about 1ms.
- A custom `fetch` is called without the client config as `this`, which fixes "Illegal invocation" from native fetch in browsers.
- The bearer credential is masked as `Bearer [REDACTED]` in logger request output. The real key is still sent.
- Per-call `RequestOptions` (`signal`, `timeout`, `headers`, `retry: { maxRetries, idempotent }`) on `get`, `post`, `put`, `patch` and `delete`. The new argument is optional and last, so existing calls are unchanged.
- `signal` cancels an in-flight request and any pending retry delay. An abort rethrows the caller's reason instead of a `NetworkError`.
- POST, PUT, PATCH and DELETE are still not retried by default. A call can opt in with `retry: { idempotent: true }` when the endpoint is safe to repeat.
- An empty, whitespace-only, or malformed API key is rejected at construction, and the error does not include the key.
- Opt-in zstd request compression: `compression: "zstd"` compresses JSON bodies of 1 KiB or more and sets `Content-Encoding: zstd`. Off by default. Fails at construction on a runtime without zstd.
- The `HttpClient` constructor accepts `compression` as optional; it defaults to `false`.
- Fixed a test that passed a function to `expect().rejects`, so it never checked the error (`dataParts rethrows error parts`).
