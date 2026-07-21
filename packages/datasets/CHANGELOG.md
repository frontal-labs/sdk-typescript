# Changelog

## 1.0.2

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

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

## 1.0.0

### Major Changes

- ca0a261: Reshape the datasets client to the real Data platform contract. The previous
  client called `/datasets/*` CRUD, versioning, row-mutation, query, and stats
  endpoints that do not exist on the API (they always 404'd).

  The client now maps to the real ingest and catalog services:

  - `datasets.list()` / `datasets.get(id)` → `/v1/data/ingest/datasets`
  - `datasets.getArtifactContent(id, manifestId)` → artifact content (raw)
  - `datasets.ingest(input)` → `POST /v1/data/ingest/datasets/ingest`
  - `datasets.schemas.list()` / `datasets.schemas.get(ref)` → `/v1/data/ingest/schemas`
  - `datasets.catalog.datasets.list()/get(id)` and `datasets.catalog.sources.list()/get(id)`
    → `/v1/data/catalog/catalog/*`

  Removed (no backing endpoint): `create`, `update`, `delete`, the `versions`
  namespace, the `data` namespace (`query`/`insert`/`upsert`/`delete`), and the
  `stats` namespace.

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2

## 0.0.1
