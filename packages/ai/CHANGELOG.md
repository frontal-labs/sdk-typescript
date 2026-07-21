# Changelog

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
