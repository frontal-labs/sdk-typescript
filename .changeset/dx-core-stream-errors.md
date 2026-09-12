---
"@frontal-labs/core": minor
---

- `FrontalClient` constructor now accepts `ClientConfigInput` (only `apiKey` required; defaults applied and validated) and applies the same `FRONTAL_API_URL` / `FRONTAL_ENV` / `FRONTAL_DEBUG` fallbacks as the `createXClient()` factories, so every entry point agrees on defaults. `retryDelay: 0` is allowed.
- SSE readers are cancelled when a consumer stops early, releasing the connection.
- Errors as data: every `FrontalError` carries `retryable`, an optional `fix` hint, `toJSON()`, and a structural `static isInstance()` (survives duplicate module copies). `NetworkError`/`TimeoutError` gain `code` (`NETWORK_ERROR`/`TIMEOUT`), `retryable`, `fix`. New `isFrontalError`, `isRetryableError`, `SdkError`.
- Streaming: new `StreamPart` union and `toStreamParts()`; `FrontalClient`/`HttpClient` gain `postStream`, `streamParts`, `postStreamParts` and accept `{ signal }` for abort.
- Shared tool types: `tool()`, `ToolDefinition`, `ToolSet`, `toolSetToRequest()` (Zod → JSON Schema), `parseToolInput()`.
- `raw(value)` marks a subtree opaque to the camel/snake key transform (used for JSON Schema in tool definitions).
- `putRaw` body typing works under DOM lib.
- Telemetry: `registerTelemetry({ tracer, onRequest, onResponse, onError, recordInputs, recordOutputs })` (or a bare OTel-style tracer) instruments every request with a span and hooks carrying `requestId`, `status`, `durationMs`. `requestIdOf(response)` reads the request id attached (non-enumerably) to every successful response object.
