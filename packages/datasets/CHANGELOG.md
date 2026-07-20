# Changelog

## 1.0.1

### Patch Changes

- Bundle `frontal/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

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
  - frontal/core@1.0.2

## 0.0.1
