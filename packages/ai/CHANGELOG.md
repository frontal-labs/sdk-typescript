# Changelog

## 0.2.0

### Minor Changes

- e4a35e6: - Tool loop: `generateText({ tools, maxSteps })` executes tools that define `execute`, feeds results back to the model and repeats up to `maxSteps`; results carry `steps` and `toolResults`, `onStepFinish` fires per step. Tools without `execute` end the loop with calls in `toolCalls`.
  - Tools that reach the model: `generateText`/`streamText` accept `tools` (built with `tool()`) and `toolChoice`; `generateText` returns `toolCalls`, `streamText().fullStream` yields `tool-call` parts. The in-memory `defineTool`/`registerTool`/`executeTool` registry is deprecated.
  - `streamText`'s `textStream` and `fullStream` are two views of one request (not a broadcast): read the one you need from the start; breaking out of either cancels the request unless the other is still being read. Previously an early `break` could not cancel the request.
  - `streamText` gains `fullStream` (`text` | `tool-call` | `finish` | `error` | `abort` | `done` parts), `finishReason`, and options `signal`, `onError`, `onAbort`, `streamRetries` (retry before first byte). Errors are yielded as data instead of tearing down the stream.
  - UI message stream protocol: `toUIMessageStreamResponse()`, `parseUIMessageStream()`, `applyUIFrame()`, `UIMessage` types (header `x-frontal-ai-ui-message-stream: v1`).
  - Options types (`GenerateTextOptions`, `StreamTextOptions`, …) now derive from `z.input`, so defaulted fields are optional for callers.

### Patch Changes

- e4a35e6: Fix `main`/`exports.require` pointing at `dist/index.cjs`, which tsup never emitted for these packages (CommonJS consumers got a missing-file error). They now point at the emitted `dist/index.js`.
- Updated dependencies [d7c7a05]
- Updated dependencies [e4a35e6]
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
