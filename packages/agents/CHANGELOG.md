# Changelog

## 2.0.0

### Major Changes

- e4a35e6: - `agents.define(name, options)` typed one-shot form with `triggers`, `stateSchema`, `tools` (shared `ToolSet`), `approveWhen`/`approvers`; builder gains `.state()`, `.tools()`, `.approveWhen()`, `.configure()`, `.toJSON()`.
  - `create()` now returns the agent resource merged with a typed accessor (`id`, `name`, … plus `message`, `watch`, `waitForCompletion`, `requiresApproval`, `.agent`).
  - `use(id, { stateSchema, stateEvent })` re-attaches with typing; `stateEvent` overrides the SSE event name that carries state snapshots (default `"state"`).
  - **Breaking:** `watch(runId, { signal })` now yields `AgentRunEvent` parts — `{ type: "event", event, data }`, typed `{ type: "state", state }`, `{ type: "error", error }` (with `retryable`), `abort`, `done` — and no longer throws mid-stream. Code that read `event.type` / `event.data` on every item must switch on `type` first (`if (e.type === "event") …`).
  - **Breaking:** `AgentBuilder.create()` returns the resource merged with a typed accessor instead of the bare resource (all resource fields are still present).
  - `toApprovalStep()` maps an agent's approval contract to a workflow approval step.
  - `create()` accepts `AgentDefinitionInput` (defaulted fields optional) and reports invalid definitions with readable field lists.
  - `AgentBuilder.on()` now throws: local handlers were never uploaded or executed.

### Patch Changes

- d7c7a05: Fix shared transport timeouts, SSE parsing, schema validation, retry safety, and
  circuit-breaker handling. Make webhook signature verification asynchronous and
  Web Crypto based so it works in native Node ESM and Fetch/Web Crypto runtimes.
  Callers must now await `verifyWebhookSignature` and `extractWebhookEvent`.
- e4a35e6: Fix `main`/`exports.require` pointing at `dist/index.cjs`, which tsup never emitted for these packages (CommonJS consumers got a missing-file error). They now point at the emitted `dist/index.js`.
- Updated dependencies [d7c7a05]
- Updated dependencies [e4a35e6]
- Updated dependencies [f50d2da]
  - @frontal-labs/core@1.1.0

## 1.0.4

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

## 1.0.3

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

## 1.0.2

### Patch Changes

- e88cf11: Add missing API surfaces

  - Add FRONTAL_AGENTS_API_URL env var support to agents client for
    per-service URL overrides
  - Add AuditSdkEventSchema alias to audit schemas
  - Add report() method to ObservabilityEventsNamespace for single
    event reporting

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 1.0.0

### Major Changes

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

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-03-06

### Added

- Initial release of the Agents package
- Multi-provider agent integrations (LangChain, LangGraph, Vercel AI, Mastra)
- Type-safe interfaces for all agent providers
- Comprehensive error handling and retry logic
- Built-in logging capabilities
- Full TypeScript support
- Test suite with comprehensive coverage
- Complete documentation

### Features

- **AgentService**: Main service class for agent interactions
- **Provider Integrations**: Support for multiple AI/agent frameworks
- **Configuration Management**: Flexible configuration system
- **Error Handling**: Robust error management
- **Streaming Support**: Real-time response streaming

### Documentation

- API Reference documentation
- Architecture overview
- Usage guide and examples
- Environment configuration guide
