# @frontal-labs/workflows

## 1.0.2

### Patch Changes

- 65ab31f: Resolves the last error-plan items.
  
  - `CircuitBreakerOpenError` is built through `createErrors`. Its constructor takes either the retry window in milliseconds, as before, or a message with options. `instanceof` holds for both.
  - `typeErrorWithCode(code, message)` creates a `TypeError` with a stable code. `invalidRequestError` uses it. Workflow response-shape errors carry `invalid_response`, and zstd without runtime support carries `unsupported_runtime`. `instanceof TypeError` still holds for all of them.
- Updated dependencies [8b754dd]
- Updated dependencies [b635776]
- Updated dependencies [dbb006f]
- Updated dependencies [65ab31f]
- Updated dependencies [9d7ab5e]
- Updated dependencies [84bb9b7]
  - @frontal-labs/core@1.2.0

## 1.0.1

### Patch Changes

- 8c7c840: Declarations resolve under `moduleResolution: nodenext`. The build now adds
  explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
  `new Frontal()` is typed for NodeNext consumers instead of silently `any`.
  Runtime code is unchanged.
- Updated dependencies [3ead735]
- Updated dependencies [8c7c840]
  - @frontal-labs/core@1.1.2

## 1.0.0

### Major Changes

- 5fd277e: Align workflow operations with the service resource routes and response shapes.
  This release changes workflow lifecycle, execution, approval, task, and template
  operations, and removes the legacy `pause`, `watch`, and `executionSummary`
  methods.

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

- ca0a261: Close remaining coverage gaps against the spec.

  - **graph**: add `bulkRead` (`/ontology/graph/graph/bulk-read`), relationship
    `getRelationship`/`updateRelationship` (`/ontology/graph/relationships/{id}`),
    async `run(runId)` status, and `capabilities`/`health`/`info`.
  - **workflows**: add `executionSummary` (`/v1/workflows/{id}/{run}/summary`).

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
