# Changelog

## 0.1.5

### Patch Changes

- 8c7c840: Declarations resolve under `moduleResolution: nodenext`. The build now adds
  explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
  `new Frontal()` is typed for NodeNext consumers instead of silently `any`.
  Runtime code is unchanged.
- Updated dependencies [3ead735]
- Updated dependencies [8c7c840]
  - @frontal-labs/core@1.1.2

## 0.1.4

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

## 0.1.3

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

## 0.1.2

### Patch Changes

- e88cf11: Add missing API surfaces

  - Add FRONTAL_AGENTS_API_URL env var support to agents client for
    per-service URL overrides
  - Add AuditSdkEventSchema alias to audit schemas
  - Add report() method to ObservabilityEventsNamespace for single
    event reporting

## 0.1.1

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 0.1.0

### Minor Changes

- ca0a261: Add the observability events surface (`sdk.observability.events`): `report`
  (`POST /v1/observability/events`), `reportBatch` (`/events/batch`), and `stats`
  (`GET /v1/observability/events/stats`), matching the real backend.

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1
