# @frontal-labs/testing

## 1.1.0

### Minor Changes

- e4a35e6: - `simulateStream()` / `mockStreamResponse()` build SSE/NDJSON `Response`s; `MockRoute` gains `stream`, `handler(request)`, `times`, and `{param}`/`:param` path wildcards (`matchPath`).
  - `mockLanguageModel({ doGenerate, doStream })` — a model-level mock implemented as fetch routes so the real `AISdk` request/response code runs; records `calls`.
  - `createScenario()` / `MockFrontal.scenario()` — sequenced multi-step scripts keyed by alias (`agents.message`, …) or `"METHOD /path/{param}"`, with `assertAllHit()`.
  - README rewritten to match the real exports (it previously documented `mockFixture`, `buildAgent`, `expectCallCount` which never existed). Removes a bogus `bin` entry.
  - `catchAllRoute()` / `catchAllRoutes()` answer any request with a body that satisfies both single-resource and paginated readers — for endpoint-contract tests.

### Patch Changes

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

- Updated dependencies
  - @frontal-labs/core@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 1.0.1

### Patch Changes

- Initial public release. Build system refactored: composite TypeScript project
  references enabled across all packages, type declarations generated via tsc,
  npm provenance configured, GitHub Actions CI/CD pipeline with Changesets
  integration.
- Updated dependencies
  - @frontal-labs/core@1.0.1
