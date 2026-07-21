# @frontal-labs/workers

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

- ca0a261: Rebrand `@frontal-labs/functions` → `@frontal-labs/workers`. The backend service
  is the Frontal edge runtime, which calls these **workers** (`/v1/workers`); there
  is no "functions" route or terminology in the runtime.

  - New package `@frontal-labs/workers` with the real API: `deploy({ name, code,
entrypoint?, envVars? })` (`POST /v1/workers`) and `invoke(name, { method?,
path?, headers?, body? })` (returns the raw `Response`).
  - Removed `@frontal-labs/functions` entirely (its list/get/delete/invoke/triggers/
    stats surface was fabricated — the runtime only supports deploy + invoke).
  - The umbrella `@frontal-labs/sdk` now exposes `sdk.workers` and the tree-shakeable
    `workers` singleton; `sdk.functions` and the `functions` export are removed.

  Migration: replace `@frontal-labs/functions` with `@frontal-labs/workers`,
  `createFunctionsClient` → `createWorkersClient`, `sdk.functions` → `sdk.workers`,
  and adopt the `deploy`/`invoke` API.

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2
