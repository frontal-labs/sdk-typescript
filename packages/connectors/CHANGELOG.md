# Changelog

## 0.0.6

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

## 0.0.5

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

## 0.0.4

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 0.0.3

### Patch Changes

- ca0a261: Fix request paths to match the real backend services.

  - **connectors**: catalog operations now call `/v1/connectors/catalog` and
    `/v1/connectors/catalog/{slug}` (were `/connectors` / `/connectors/{slug}`),
    and replay calls `/v1/connectors/sync-runs/{id}/replay`.
  - **billing** & **schedules**: removed the hardcoded `/v1/` prefix from routes so
    they no longer produce a doubled `/v1/v1/` path against the versioned base URL.

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1
