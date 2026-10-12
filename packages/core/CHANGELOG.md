# Changelog

## 1.1.0

### Minor Changes

- e4a35e6: - `FrontalClient` constructor now accepts `ClientConfigInput` (only `apiKey` required; defaults applied and validated) and applies the same `FRONTAL_API_URL` / `FRONTAL_ENV` / `FRONTAL_DEBUG` fallbacks as the `createXClient()` factories, so every entry point agrees on defaults. `retryDelay: 0` is allowed.
  - SSE readers are cancelled when a consumer stops early, releasing the connection.
  - Errors as data: every `FrontalError` carries `retryable`, an optional `fix` hint, `toJSON()`, and a structural `static isInstance()` (survives duplicate module copies). `NetworkError`/`TimeoutError` gain `code` (`NETWORK_ERROR`/`TIMEOUT`), `retryable`, `fix`. New `isFrontalError`, `isRetryableError`, `SdkError`.
  - Streaming: new `StreamPart` union and `toStreamParts()`; `FrontalClient`/`HttpClient` gain `postStream`, `streamParts`, `postStreamParts` and accept `{ signal }` for abort.
  - Shared tool types: `tool()`, `ToolDefinition`, `ToolSet`, `toolSetToRequest()` (Zod → JSON Schema), `parseToolInput()`.
  - `raw(value)` marks a subtree opaque to the camel/snake key transform (used for JSON Schema in tool definitions).
  - `putRaw` body typing works under DOM lib.
  - Telemetry: `registerTelemetry({ tracer, onRequest, onResponse, onError, recordInputs, recordOutputs })` (or a bare OTel-style tracer) instruments every request with a span and hooks carrying `requestId`, `status`, `durationMs`. `requestIdOf(response)` reads the request id attached (non-enumerably) to every successful response object.

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
