# @frontal-labs/data

## 0.1.0

### Minor Changes

- ca0a261: Add `@frontal-labs/data`, a client for the Data platform processing subdomains
  (`/v1/data/*`) that previously had no SDK coverage: `aggregations`, `archival`,
  `enrichment`, `exports`, `normalization`, `quality`, `query`, `schemas`,
  `serving`, `streams`, `sync`, and `transformations`.

  Each subdomain is a namespace with the shared `capabilities`/`health`/`info`/
  `runs` envelope; resource subdomains add `list`/`create`/`get`/`execute` (the
  execution verb matches the backend — e.g. `evaluations` for quality,
  `refreshes` for serving, `deliveries` for streams). The umbrella `@frontal-labs/sdk`
  exposes it as `sdk.data`.

  Datasets (ingest + catalog), pipelines, and lineage remain in their dedicated
  packages.

### Patch Changes

- Updated dependencies [ca0a261]
  - @frontal-labs/core@1.0.2
