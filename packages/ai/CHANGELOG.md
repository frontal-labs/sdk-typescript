# Changelog

## 0.2.0

### Minor Changes

- b1c3216: Point the AI client at the AI gateway by default. `createAIClient(frontalClient)`
  and the `ai` singleton now use `https://ai.frontal.dev` instead of the public API
  base URL, which does not serve the `/ai/*` and `/internal/*` routes. Credentials and
  transport settings from the `FrontalClient` are still reused. `FRONTAL_API_URL` no
  longer changes the AI base URL; pass `baseUrl` to `createAIClient` to override it.
  
  `IAIClient` now declares direct return types (`Promise<GenerateTextResult>`, not
  `Promise<APIResponse<...>>`), matching the implementation. The `APIResponse` type
  re-export remains.
  
  `registerTool` is now generic, so typed tools from `defineTool` can be registered
  without casts. The method is still deprecated; use `tool()` with `generateText({ tools })`.
- 6bb6903: Breaking: the AI SDK no longer calls the gateway's `/internal/*` routes. Removed `embed`, `generateSpeech`, `generateImage`, `generateVideo`, `transcribe`, `moderate`, `listModels`, `getDefaultModels` and `rerank`, with their option and result types. `generateText`, `streamText`, `generateObject` and `health` are unchanged. Under 0.x semver this is a breaking change released as a minor bump.
  
  - `ai.decisions.decide({ model, state, questions })` answers typed `noul`, `choice` and `score` questions. Answers are typed per question name, and the result carries `requestId`, `model` and `usage` (including `cachedTokens` when reported). Input is validated before any request is sent (`DecisionRequestError`). A response that doesn't match the questions raises `DecisionResponseError`.
  - `ai.decisions.models()` lists the decision models.
  - `onDecision` audit hook: receives a record with a SHA-256 digest of the state, never the state. A throwing hook fails the call.
  - `evaluateDecision(result, policy)` evaluates typed rules over the answers and returns `allow`, `review` or `reject`, with every rule that fired and its reason.
  - `createAIClient({ compression: "zstd" })` compresses large request bodies. Off by default.
  - The decisions routes and schemas are in `contracts/openapi/ai.openapi.json`, generated from the Zod wire schemas.
  - Testing: `mockDecisionModel` scripts the decision model at the transport layer. The scenario aliases `ai.decisions.decide` and `ai.decisions.models` replace the removed `ai.embed` and `ai.listModels`.
- e4a35e6: - Tool loop: `generateText({ tools, maxSteps })` executes tools that define `execute`, feeds results back to the model and repeats up to `maxSteps`; results carry `steps` and `toolResults`, `onStepFinish` fires per step. Tools without `execute` end the loop with calls in `toolCalls`.
  - Tools that reach the model: `generateText`/`streamText` accept `tools` (built with `tool()`) and `toolChoice`; `generateText` returns `toolCalls`, `streamText().fullStream` yields `tool-call` parts. The in-memory `defineTool`/`registerTool`/`executeTool` registry is deprecated.
  - `streamText`'s `textStream` and `fullStream` are two views of one request (not a broadcast): read the one you need from the start; breaking out of either cancels the request unless the other is still being read. Previously an early `break` could not cancel the request.
  - `streamText` gains `fullStream` (`text` | `tool-call` | `finish` | `error` | `abort` | `done` parts), `finishReason`, and options `signal`, `onError`, `onAbort`, `streamRetries` (retry before first byte). Errors are yielded as data instead of tearing down the stream.
  - UI message stream protocol: `toUIMessageStreamResponse()`, `parseUIMessageStream()`, `applyUIFrame()`, `UIMessage` types (header `x-frontal-ai-ui-message-stream: v1`).
  - Options types (`GenerateTextOptions`, `StreamTextOptions`, …) now derive from `z.input`, so defaulted fields are optional for callers.
- af9e479: - `ai.extractions.create({ vocabulary, input })` extracts an intent and typed entities from text against a vocabulary pinned by version (`id@x.y.z`; `latest` does not type-check). Entity spans are returned as JavaScript string offsets, so `input.slice(span.start, span.end)` is the value. A span that does not label its value throws `ExtractionResponseError`. Input is checked before any request (`ExtractionRequestError`), with the 8000-character limit counted in code points.
  - `ai.extractions.vocabularies.list()` and `.get(pin)` read the served vocabulary and its schema.
  - `RequestOptions.idempotencyKey` sends an `Idempotency-Key` header. The AI client generates one per call and reuses it on retries; decisions do the same, because the gateway requires the header on every write.
  - `RequestOptions.preserveKeys` copies named top-level response keys through as sent, instead of camelCasing them. Used for `parameters` and vocabulary schemas.
  - The gateway's nested error envelope `{"error":{message,type,param,code}}` maps to the typed error with its `code`, and a plain-text error body keeps its message.
  - `mockExtractionModel` in `@frontal-labs/testing` scripts the extraction model, with spans computed from the input.

### Patch Changes

- e4a35e6: Fix `main`/`exports.require` pointing at `dist/index.cjs`, which tsup never emitted for these packages (CommonJS consumers got a missing-file error). They now point at the emitted `dist/index.js`.
- Updated dependencies [d7c7a05]
- Updated dependencies [6bb6903]
- Updated dependencies [e4a35e6]
- Updated dependencies [af9e479]
- Updated dependencies [f50d2da]
  - @frontal-labs/core@1.1.0

## 0.1.3

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

## 0.1.2

### Patch Changes

- Publish `@frontal-labs/core` as a shared, public dependency instead of bundling
  it into each package. Previously core's runtime was bundled but its type
  declarations still imported `@frontal-labs/core`, which was unpublished — so
  consumers hit `Cannot find module '@frontal-labs/core'`. Core is now a normal
  dependency of every package, so both runtime and types resolve under any
  package manager (npm/pnpm/yarn/bun) and runtime, and the `@frontal-labs/sdk`
  umbrella shares one `FrontalClient` type across sub-packages.
- Updated dependencies
  - @frontal-labs/core@1.0.3

## 0.1.1

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 0.1.0

### Minor Changes

- ca0a261: Align the agents and ai clients with the real backend.

  - **agents**: the client previously routed every operation to the Workflows API
    (`/workflows`, `/workflows/batch`) — the wrong service. It now targets the real
    Agents API (`/v1/agents/*`): `list`/`create` on `/agents`, accessor
    `get`/`update`/`delete`/`rollback`/`versions` on `/agents/{id}`, runs on
    `/agents/{id}/runs` and `/agents/runs/{id}` (`run`, `conversation`, SSE
    `watch` via `/agents/runs/{id}/stream`), plus `health()`. Removed the
    fabricated `deploy`, `pause`, `resume`, `simulate`, `escalations`, and
    `experiments` surfaces that had no backing endpoint. `message()` now returns
    the created run.
  - **ai**: added the previously-missing gateway endpoints — `getDefaultModels()`
    (`/internal/models/defaults`), `rerank()` (`/internal/rerank`), and `health()`
    (`/health`).

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1

### Patch Changes

- Initial public release. Build system refactored: composite TypeScript project
  references enabled across all packages, type declarations generated via tsc,
  npm provenance configured, GitHub Actions CI/CD pipeline with Changesets
  integration.
- Updated dependencies
  - @frontal-labs/core@1.0.1

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

-

### Changed

-

### Deprecated

-

### Removed

-

### Fixed

-

### Security

-

## [Version] - YYYY-MM-DD

### Added

-

### Changed

-

### Deprecated

-

### Removed

-

### Fixed

-

### Security

-
