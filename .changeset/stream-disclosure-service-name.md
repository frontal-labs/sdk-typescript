---
"@frontal-labs/ai": minor
"@frontal-labs/core": minor
"@frontal-labs/testing": patch
---

Stream errors no longer leak developer text, and spans and errors name their service.

- `@frontal-labs/ai`: `serializeError()` sends only `name`, `code`, `statusCode`, `retryable` and a client-safe `message`. The server's `public` message is used when set, otherwise `"An error occurred."`. Developer text, `fix`, `docs` and `requestId` are no longer streamed, and plain errors use the same generic text. `UIError` drops `fix`, `docs` and `requestId`, so code that read them will fail to type-check.
- `@frontal-labs/core`: `HttpClient` accepts `serviceName`, which every service client sets. It is recorded as `service.name` on spans and on error `attributes`. Polling timeouts set `metadata.operation` to `"poll"` and keep the `TIMEOUT` code. The network-error and schema-error logger hooks receive redacted diagnostics instead of raw errors.
- `@frontal-labs/testing`: unmatched mock routes return the gateway's nested error envelope, built with `mockError()`.
