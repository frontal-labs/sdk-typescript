# Cross-language SDK ports

## Summary

Repair the reviewed TypeScript defects, then establish production-ready Python,
Java, Go, and Rust SDK monorepos that follow each language's package conventions.
Use the TypeScript public surfaces plus the local Frontal service routes as the
behavioral contract. Keep each SDK's HTTP, auth, timeout, retry, error, and
streaming behavior centralized in a shared core library.

## Context

- `sdk-python`, `sdk-java`, `sdk-go`, and `sdk-rust` exist as empty repositories
  with configured remotes and no commits or source files.
- `sdk-typescript/packages/*/src` contains the current service SDK surface;
  `contracts/sdk-endpoints.json` provides a route inventory, but its response
  schemas are incomplete.
- The local `frontal` repository provides authoritative REST contracts for
  workflows, approvals, executions, runs, and templates. Do not invent routes
  for operations that have no server implementation.
- Each monorepo will expose a shared transport and one module/crate/package per
  supported TypeScript service, plus a unified client. Arbitrary JSON is
  limited to extensible API payload fields; public operations use native typed
  request and response models.

## System impact

- The TypeScript transport stays the single implementation of HTTP concerns;
  service SDKs share its error, retry, timeout, pagination, and stream policy.
- New language clients own transport state per client instance, accept custom
  transports only through documented public interfaces, and never rely on
  hidden global configuration.
- Tests exercise the real HTTP stack against in-process HTTP servers, without
  mocked transport implementations or placeholder responses.
- Publishable artifacts remain language-native: a `uv` workspace, Maven
  reactor, Go module with public service packages, and Cargo workspace.

## Changes

- TypeScript: fix workflow resource routing and action endpoints, bearer JWT
  forwarding in `AuthSdk.getUser`, abort status in `useAgentRun`, and zero-valued
  transcription options; add regression tests and update affected docs.
- Python: create `pyproject.toml`, `src/frontal_sdk`, typed service modules,
  unit/integration tests, and Ruff/mypy formatting and lint configuration.
- Java: create a Java 17 Maven multi-module project with core and service
  modules, Jackson DTOs, JUnit integration tests, and Spotless/Checkstyle rules.
- Go: create an idiomatic module with `core`, service packages, a unified
  client, `httptest` integration tests, `gofmt`, `go vet`, and golangci-lint.
- Rust: create a Cargo workspace with core and service crates, serde models,
  Tokio/reqwest transport, local-server integration tests, rustfmt, and Clippy.
- Add package documentation, examples, license, contribution guidance, and CI
  appropriate to each repository.

## Verification

- TypeScript: focused regression tests, complete test suite, type-check, lint,
  format check, and workspace build.
- Python: `uv sync --all-packages`, pytest, mypy, Ruff lint/format checks, and
  wheel build.
- Java: Maven reactor `verify`, including unit/integration tests and formatting
  checks.
- Go: `go test ./...`, `go vet ./...`, `gofmt` check, golangci-lint, and build.
- Rust: `cargo test --workspace`, `cargo build --workspace`, `cargo fmt --check`,
  and `cargo clippy --workspace --all-targets -- -D warnings`.
