# Changelog

## 1.2.0

### Minor Changes

- 8b754dd: Errors now extend the shared `@frontal-labs/error` base class.
  
  - `FrontalError`, the status subclasses, `NetworkError` and `TimeoutError` are real `@frontal-labs/error` errors. The library's `isFrontalError` returns `true` for all of them. Core's own `isFrontalError` is unchanged: it returns `false` for `NetworkError` and `TimeoutError`.
  - `FrontalError.requestId` is no longer `readonly`, because the base class sets it.
  - Statuses outside 400–599 are clamped to `500`, and the original value is kept in `metadata.rawStatus`.
  - A blank error code becomes `UNKNOWN_ERROR` instead of throwing.
  - Error stacks start at the call site, not inside the constructor.
  - `NetworkError` and `TimeoutError` no longer serialize their `cause`. Their `toJSON()` keeps `name`, `code`, `message`, `retryable` and `fix`.
  - `FrontalError.toJSON()` keeps its existing shape. `String(error)` keeps the `Name: message` form.
  - `@frontal-labs/error@0.7.0` is bundled into the ESM and CJS builds. It is pinned exactly and has no runtime import.
  - New exports: `describeSdkError()` for log-ready diagnostics (no `cause` or `stack`, `frt_` keys redacted, `scope/code` fingerprint), `redactSecrets()`, and the `SdkErrorDiagnostics` and `SerializedTransportError` types.
  - The request id is also read from the `x-frontal-id` header when `x-request-id` is absent.
- b635776: Error diagnostics, boundary attributes, and test helpers.
  
  - `CircuitBreakerOpenError` extends the shared base class with code `CIRCUIT_OPEN`. It is retryable, so `isRetryableError()` is true. `instanceof` checks still hold.
  - HTTP errors carry `attributes` with `http.status_code` and `frontal.request_id`.
  - The configured `logger.error` receives redacted diagnostics for API errors. Under `debug`, the same record is printed with `console.error`.
  - `logSdkFailure(error, logger?)` in `@frontal-labs/observability` logs a redacted record with a `scope/code` fingerprint.
  - `mockError()` and `expectFrontalError()` in `@frontal-labs/testing` build gateway-shaped error responses and assert on code, status and retryability.
- 65ab31f: Resolves the last error-plan items.
  
  - `CircuitBreakerOpenError` is built through `createErrors`. Its constructor takes either the retry window in milliseconds, as before, or a message with options. `instanceof` holds for both.
  - `typeErrorWithCode(code, message)` creates a `TypeError` with a stable code. `invalidRequestError` uses it. Workflow response-shape errors carry `invalid_response`, and zstd without runtime support carries `unsupported_runtime`. `instanceof TypeError` still holds for all of them.
- 9d7ab5e: Edge and Deno runtime checks, and stable codes for argument errors.
  
  - Polling timeouts keep code `TIMEOUT` and carry `metadata.operation === "poll"`, so existing `code === "TIMEOUT"` checks keep working. A distinct polling code is planned for the next major.
  - `invalidRequestError(message)` creates the `TypeError` that SDK argument validation throws, with code `invalid_request`. `instanceof TypeError` still holds. `ai` (`generateText` and `streamText` with neither a prompt nor messages) and `ontology` (entity and relation definitions and arguments) now throw it.
  - `TimeoutError` accepts an options object, so a code and a fix can be set when it is created.
  - `@frontal-labs/core` is verified in workerd (Miniflare, no compatibility flags) and Deno 2.9.8. Both checks run in CI.
- 84bb9b7: Stream errors no longer leak developer text, and spans and errors name their service.
  
  - `@frontal-labs/ai`: `serializeError()` sends only `name`, `code`, `statusCode`, `retryable` and a client-safe `message`. The server's `public` message is used when set, otherwise `"An error occurred."`. Developer text, `fix`, `docs` and `requestId` are no longer streamed, and plain errors use the same generic text. `UIError` drops `fix`, `docs` and `requestId`, so code that read them will fail to type-check.
  - `@frontal-labs/core`: `HttpClient` accepts `serviceName`, which every service client sets. It is recorded as `service.name` on spans and on error `attributes`. Polling timeouts set `metadata.operation` to `"poll"` and keep the `TIMEOUT` code. The network-error and schema-error logger hooks receive redacted diagnostics instead of raw errors.
  - `@frontal-labs/testing`: unmatched mock routes return the gateway's nested error envelope, built with `mockError()`.

### Patch Changes

- dbb006f: Fixes from the error-integration plan's remaining items.
  
  - `@frontal-labs/ai`: the client reads `code` and `message` from non-OK responses in the `{ error: { code, message } }` envelope that `errorResponse()` produces, as well as from flat bodies. Previously an app's structured error showed as `HTTP_<status>`.
  - `@frontal-labs/core`: `FRONTAL_DEBUG` output is rendered with the shared library's `formatError` (`auto`, honouring `NO_COLOR` and TTY) and redacted with `redactSecrets`, so API keys never appear in debug output.

## 1.1.2

### Patch Changes

- 3ead735: Core error handling for the ontology API:
  
  - HTTP 412 now throws `PreconditionFailedError` (status 412), exported from the
    core and SDK entry points. It is a `FrontalError`, so existing `instanceof
    FrontalError` checks still hold.
  - When an error body has a `code` and a `detail` but no `message`, `detail` is
    the error message. Other error bodies keep their previous message.
- 8c7c840: Declarations resolve under `moduleResolution: nodenext`. The build now adds
  explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
  `new Frontal()` is typed for NodeNext consumers instead of silently `any`.
  Runtime code is unchanged.

## 1.1.1

### Patch Changes

- 8baca7b: Add typed ontology entities. `createFrontalClient<TOntology>(config, runtime)`
  accepts the generated `Ontology` type and the runtime metadata emitted by the
  Frontal CLI, and exposes `ontology.<Entity>` with:
  
  - `list()`: every object of the entity's object type. The backend does not
    page this list, so it is returned in one call.
  - `get(id)`, `delete(id)`.
  - `create(input)`: the server generates the id.
  - `put(id, input)`: writes the whole object under an explicit id.
  - `update(id, patch)`: changes only writable fields. It is a GET, merge, then
    PUT, so it is not atomic.
  - Lazy `belongsTo` relation accessors, such as `await customer.company()`.
  
  Stored fields live under the object's `properties`; the entity exposes them at
  the top level with `id` set to the object id. Responses and inputs are checked
  against the runtime metadata and throw `ValidationError` (`INVALID_RESPONSE` or
  `INVALID_INPUT`) with per-field detail. A record of another object type is
  rejected. Unknown entities throw a `TypeError` listing the known entities.
  `OntologyDefinition` rejects invalid hand-written ontologies at compile time.
  
  Breaking within this release: `create(id, input)` is now `put(id, input)`, and
  `create(input)` generates the id. `hasOne` relations are removed. The runtime
  metadata requires `objectTypeIds` and has the shape `OntologyRuntime<O>`.
  Existing calls without a type argument are unchanged.
  
  `@frontal-labs/core`: `preserveKeys` now applies to each element of a list
  response, so property names inside `properties` are kept exactly as sent.

## 1.1.0

### Minor Changes

- 6bb6903: - New `PaymentRequiredError` (HTTP 402) and `PayloadTooLargeError` (HTTP 413), so billing and body-size failures can be matched by type instead of `status`.
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
- e4a35e6: - `FrontalClient` constructor now accepts `ClientConfigInput` (only `apiKey` required; defaults applied and validated) and applies the same `FRONTAL_API_URL` / `FRONTAL_ENV` / `FRONTAL_DEBUG` fallbacks as the `createXClient()` factories, so every entry point agrees on defaults. `retryDelay: 0` is allowed.
  - SSE readers are cancelled when a consumer stops early, releasing the connection.
  - Errors as data: every `FrontalError` carries `retryable`, an optional `fix` hint, `toJSON()`, and a structural `static isInstance()` (survives duplicate module copies). `NetworkError`/`TimeoutError` gain `code` (`NETWORK_ERROR`/`TIMEOUT`), `retryable`, `fix`. New `isFrontalError`, `isRetryableError`, `SdkError`.
  - Streaming: new `StreamPart` union and `toStreamParts()`; `FrontalClient`/`HttpClient` gain `postStream`, `streamParts`, `postStreamParts` and accept `{ signal }` for abort.
  - Shared tool types: `tool()`, `ToolDefinition`, `ToolSet`, `toolSetToRequest()` (Zod → JSON Schema), `parseToolInput()`.
  - `raw(value)` marks a subtree opaque to the camel/snake key transform (used for JSON Schema in tool definitions).
  - `putRaw` body typing works under DOM lib.
  - Telemetry: `registerTelemetry({ tracer, onRequest, onResponse, onError, recordInputs, recordOutputs })` (or a bare OTel-style tracer) instruments every request with a span and hooks carrying `requestId`, `status`, `durationMs`. `requestIdOf(response)` reads the request id attached (non-enumerably) to every successful response object.
- af9e479: - `ai.extractions.create({ vocabulary, input })` extracts an intent and typed entities from text against a vocabulary pinned by version (`id@x.y.z`; `latest` does not type-check). Entity spans are returned as JavaScript string offsets, so `input.slice(span.start, span.end)` is the value. A span that does not label its value throws `ExtractionResponseError`. Input is checked before any request (`ExtractionRequestError`), with the 8000-character limit counted in code points.
  - `ai.extractions.vocabularies.list()` and `.get(pin)` read the served vocabulary and its schema.
  - `RequestOptions.idempotencyKey` sends an `Idempotency-Key` header. The AI client generates one per call and reuses it on retries; decisions do the same, because the gateway requires the header on every write.
  - `RequestOptions.preserveKeys` copies named top-level response keys through as sent, instead of camelCasing them. Used for `parameters` and vocabulary schemas.
  - The gateway's nested error envelope `{"error":{message,type,param,code}}` maps to the typed error with its `code`, and a plain-text error body keeps its message.
  - `mockExtractionModel` in `@frontal-labs/testing` scripts the extraction model, with spans computed from the input.

### Patch Changes

- d7c7a05: Fix shared transport timeouts, SSE parsing, schema validation, retry safety, and
  circuit-breaker handling. Make webhook signature verification asynchronous and
  Web Crypto based so it works in native Node ESM and Fetch/Web Crypto runtimes.
  Callers must now await `verifyWebhookSignature` and `extractWebhookEvent`.
- f50d2da: Avoid ambiguous regular expression matching when converting keys to snake case.

## 1.0.4

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).

## 1.0.3

### Patch Changes

- Publish `@frontal-labs/core` as a shared, public dependency instead of bundling
  it into each package. Previously core's runtime was bundled but its type
  declarations still imported `@frontal-labs/core`, which was unpublished — so
  consumers hit `Cannot find module '@frontal-labs/core'`. Core is now a normal
  dependency of every package, so both runtime and types resolve under any
  package manager (npm/pnpm/yarn/bun) and runtime, and the `@frontal-labs/sdk`
  umbrella shares one `FrontalClient` type across sub-packages.

## 1.0.2

### Patch Changes

- ca0a261: Fix routing so requests reach the real backend.

  - **core**: `HttpClient.buildUrl` now normalizes an accidental double `/v1/v1/`
    prefix (base URL already ends in `/v1`) instead of only warning in debug mode.
    This class of 404s is now impossible regardless of how a package writes its
    paths. `route()` collapses the same duplication.
  - **blob**: remapped from the non-existent `/storage/lake/lake/tables/*` paths to
    the real Blob object-store API (`/v1/blob/object/{bucket}/{key}`,
    `/v1/blob/object/{list,sign,copy,move,info}`). Uploads now send multipart form
    data; copy/move send the backend's `{ bucketId, sourceKey, destinationBucket,
destinationKey }` body; `getSignedUrl` returns the `signedURL` from the response.
    Object CRUD/list/sign/copy/move/metadata previously always 404'd.
  - **webhooks**: removed the `/v1/v1/webhooks/...` double-prefix from `get`,
    `update`, `delete`, `rotateSecret`, and delivery routes; paths now resolve to
    the real `/v1/webhooks/*` service.

## 1.0.1

### Patch Changes

- Initial public release. Build system refactored: composite TypeScript project
  references enabled across all packages, type declarations generated via tsc,
  npm provenance configured, GitHub Actions CI/CD pipeline with Changesets
  integration.

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-03-06

### Added

- Initial release of the Core package
- HTTP client with retry logic and error handling
- Configuration management system
- Type definitions and schemas
- Pagination helpers
- Testing utilities
- Full TypeScript support
- Test suite with comprehensive coverage
- Complete documentation

### Features

- **FrontalClient**: Main client class with HTTP capabilities
- **HttpClient**: Low-level HTTP client with retry logic
- **ConfigManager**: Configuration management system
- **ErrorHandler**: Centralized error handling
- **TypeDefinitions**: TypeScript interfaces and schemas

### Documentation

- API Reference documentation
- Architecture overview
- Usage guide and examples
- Environment configuration guide
