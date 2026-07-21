# @frontal-labs/sdk

## 1.0.4

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4
  - @frontal-labs/agents@1.0.4
  - @frontal-labs/ai@0.1.3
  - @frontal-labs/audit@0.0.7
  - @frontal-labs/auth@1.0.3
  - @frontal-labs/billing@1.0.3
  - @frontal-labs/blob@1.0.3
  - @frontal-labs/connectors@0.0.6
  - @frontal-labs/data@0.1.3
  - @frontal-labs/datasets@1.0.3
  - @frontal-labs/events@1.0.3
  - @frontal-labs/governance@0.0.6
  - @frontal-labs/graph@0.1.3
  - @frontal-labs/integrations@0.0.6
  - @frontal-labs/lineage@0.0.6
  - @frontal-labs/observability@0.1.4
  - @frontal-labs/ontology@1.0.3
  - @frontal-labs/pipelines@0.0.5
  - @frontal-labs/sandbox@1.0.3
  - @frontal-labs/schedules@1.0.3
  - @frontal-labs/webhooks@0.0.6
  - @frontal-labs/workers@0.1.3
  - @frontal-labs/workflows@0.1.3

## 1.0.3

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
  - @frontal-labs/agents@1.0.3
  - @frontal-labs/ai@0.1.2
  - @frontal-labs/audit@0.0.6
  - @frontal-labs/auth@1.0.2
  - @frontal-labs/billing@1.0.2
  - @frontal-labs/blob@1.0.2
  - @frontal-labs/connectors@0.0.5
  - @frontal-labs/data@0.1.2
  - @frontal-labs/datasets@1.0.2
  - @frontal-labs/events@1.0.2
  - @frontal-labs/governance@0.0.5
  - @frontal-labs/graph@0.1.2
  - @frontal-labs/integrations@0.0.5
  - @frontal-labs/lineage@0.0.5
  - @frontal-labs/observability@0.1.3
  - @frontal-labs/ontology@1.0.2
  - @frontal-labs/pipelines@0.0.4
  - @frontal-labs/sandbox@1.0.2
  - @frontal-labs/schedules@1.0.2
  - @frontal-labs/webhooks@0.0.5
  - @frontal-labs/workers@0.1.2
  - @frontal-labs/workflows@0.1.2

## 1.0.2

### Patch Changes

- Updated dependencies [e88cf11]
  - @frontal-labs/agents@1.0.2
  - @frontal-labs/audit@0.0.5
  - @frontal-labs/observability@0.1.2

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.
- Updated dependencies
  - @frontal-labs/agents@1.0.1
  - @frontal-labs/ai@0.1.1
  - @frontal-labs/audit@0.0.4
  - @frontal-labs/auth@1.0.1
  - @frontal-labs/billing@1.0.1
  - @frontal-labs/blob@1.0.1
  - @frontal-labs/connectors@0.0.4
  - @frontal-labs/data@0.1.1
  - @frontal-labs/datasets@1.0.1
  - @frontal-labs/events@1.0.1
  - @frontal-labs/governance@0.0.4
  - @frontal-labs/graph@0.1.1
  - @frontal-labs/integrations@0.0.4
  - @frontal-labs/lineage@0.0.4
  - @frontal-labs/observability@0.1.1
  - @frontal-labs/ontology@1.0.1
  - @frontal-labs/pipelines@0.0.3
  - @frontal-labs/sandbox@1.0.1
  - @frontal-labs/schedules@1.0.1
  - @frontal-labs/webhooks@0.0.4
  - @frontal-labs/workers@0.1.1
  - @frontal-labs/workflows@0.1.1

## 1.0.0

### Major Changes

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

- ca0a261: Remove the `@frontal-labs/flags`, `@frontal-labs/vectors`, and `@frontal-labs/search`
  packages. An end-to-end audit against the Frontal backend confirmed these three
  packages have no corresponding backend service on the public API (no feature-flag
  service; no vector/embedding or search service — embeddings are only exposed as
  internal inference-gateway endpoints consumed by `@frontal-labs/ai`). They called
  fabricated or double-prefixed paths (`/v1/v1/...`) that always 404 in production, so
  they are dropped rather than maintained as non-functional stubs.

  The umbrella `@frontal-labs/sdk` no longer exposes `sdk.flags`, `sdk.vectors`, or
  `sdk.search`, and the corresponding tree-shakeable singletons are removed.

- ca0a261: Remove the `@frontal-labs/queues` and `@frontal-labs/organization` packages.

  An audit of the Frontal backend confirmed neither has a public HTTP API:

  - **queues** — both candidate backends (`events/backend/queue`, `compute/backend/jobs`)
    are gRPC-only (the queue service is a stub); there is no REST surface to build
    against.
  - **organization** — there is no organization/team/member/role service. The
    fragments that exist live elsewhere (billing `/v1/tenants`, governance
    `/v1/roles`, auth `/admin/users`), so a cohesive `organization` client would be
    fabricated.

  The umbrella `@frontal-labs/sdk` no longer exposes `sdk.queues` or
  `sdk.organization`. These can be reintroduced if/when the backend gains a public
  HTTP API (a queues gateway/transcoding layer, or a dedicated organization service).

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
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
- Updated dependencies [ca0a261]
  - @frontal-labs/data@0.1.0
  - @frontal-labs/agents@1.0.0
  - @frontal-labs/ai@0.1.0
  - @frontal-labs/auth@1.0.0
  - @frontal-labs/billing@1.0.0
  - @frontal-labs/events@1.0.0
  - @frontal-labs/connectors@0.0.3
  - @frontal-labs/schedules@1.0.0
  - @frontal-labs/core@1.0.2
  - @frontal-labs/blob@1.0.0
  - @frontal-labs/webhooks@0.0.3
  - @frontal-labs/graph@0.1.0
  - @frontal-labs/workflows@0.1.0
  - @frontal-labs/observability@0.1.0
  - @frontal-labs/ontology@1.0.0
  - @frontal-labs/workers@0.1.0
  - @frontal-labs/datasets@1.0.0
  - @frontal-labs/sandbox@1.0.0
  - @frontal-labs/audit@0.0.3
  - @frontal-labs/governance@0.0.3
  - @frontal-labs/integrations@0.0.3
  - @frontal-labs/lineage@0.0.3
  - @frontal-labs/pipelines@0.0.2

## 0.0.2

### Patch Changes

- 079eb9f: Initial release of the unified SDK umbrella package. Provides a single
  `Sdk` class with lazy accessors for all 25 Frontal services, plus a
  `createSdkClient()` factory and tree-shakeable individual singletons.
