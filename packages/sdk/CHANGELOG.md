# @frontal-labs/sdk

## 2.2.0

### Minor Changes

- 4885c1b: Use the SDK directly, without a generated client.
  
  - `new Frontal({ apiKey })` and `frontal` are typed by the generated ontology
    once `ontology.d.ts` augments `FrontalOntologyRegistry`. With no
    augmentation the registry is empty and the client is untyped, as before.
  - The runtime metadata is optional. Without it, the first use of an entity
    reads the object types from the API once per client, derives the same
    metadata the generator emits, and caches it. Concurrent first calls share
    one request, and a failed read is retried on the next call. A name the live
    ontology does not contain rejects on use.
  - With the metadata passed in (the generated `.frontal/client.ts` does this),
    no request is made, as before.
  - `createFrontalClient<TOntology>` and `Frontal<TOntology>` default to the
    registry. Passing an ontology type explicitly still works.

### Patch Changes

- 3ead735: Core error handling for the ontology API:
  
  - HTTP 412 now throws `PreconditionFailedError` (status 412), exported from the
    core and SDK entry points. It is a `FrontalError`, so existing `instanceof
    FrontalError` checks still hold.
  - When an error body has a `code` and a `detail` but no `message`, `detail` is
    the error message. Other error bodies keep their previous message.
- 8c7c840: Declarations resolve under `moduleResolution: nodenext`. The build now adds
  explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
  `new Frontal()` is typed for NodeNext consumers instead of silently `any`.
  Runtime code is unchanged.
- cafacbd: Ontology contract v2 on typed entities.
  
  - `query({ where, limit, cursor })`: one page of matching entities. `where`
    is typed per field: strings take `eq`, `in`, `contains`, `startsWith`;
    numbers take `eq`, `in`, `gt`, `gte`, `lt`, `lte`; booleans take `eq`; enums
    take `eq` and `in` with their declared values. Unknown fields and operators
    the type does not allow are rejected before any request.
  - `list()` follows the pages of `query` until the last one, with a limit of
    10,000 pages.
  - `update` is now conditional: it reads the object's `ETag` and writes with
    `If-Match`. A write that lost a race is retried from a fresh read, up to three
    attempts, then throws a `ConflictError` with code `PRECONDITION_FAILED`. It is
    never written without an `ETag`.
  - Relations carry a `cardinality`. `belongsTo` keeps its foreign key;
    `hasOne`, `hasMany` and `manyToMany` resolve through relationship instances
    and need a `relationshipTypeId`. `hasOne` with more than one target throws
    `TOO_MANY_RELATIONSHIPS`.
  
  These endpoints are ontology contract v2. A backend that does not serve them
  rejects the calls.
- Updated dependencies [3ead735]
- Updated dependencies [8c7c840]
- Updated dependencies [cafacbd]
- Updated dependencies [b0c6766]
- Updated dependencies [4885c1b]
  - @frontal-labs/core@1.1.2
  - @frontal-labs/agents@2.0.1
  - @frontal-labs/ai@0.3.0
  - @frontal-labs/audit@1.0.1
  - @frontal-labs/auth@1.0.5
  - @frontal-labs/billing@1.0.4
  - @frontal-labs/blob@1.1.1
  - @frontal-labs/connectors@0.0.7
  - @frontal-labs/data@0.1.4
  - @frontal-labs/functions@0.0.3
  - @frontal-labs/governance@0.0.7
  - @frontal-labs/lineage@0.0.7
  - @frontal-labs/observability@0.1.5
  - @frontal-labs/ontology@1.2.0
  - @frontal-labs/pipelines@0.0.7
  - @frontal-labs/schedules@1.0.4
  - @frontal-labs/webhooks@1.0.1
  - @frontal-labs/workflows@1.0.1

## 2.1.0

### Minor Changes

- 8baca7b: Add typed ontology entities. `createFrontalClient<TOntology>(config, runtime)`
  accepts the generated `Ontology` type and the runtime metadata emitted by the
  Frontal CLI, and exposes `ontology.<Entity>` with:
  
  - `list()`: every object of the entity's object type. The backend does not
    page this list, so it is returned in one call.
  - `get(id)`, `delete(id)`.
  - `create(input)`: the server generates the id.
  - `put(id, input)`: writes the whole object under an explicit id.
  - `update(id, patch)`: changes only writable fields. It is a GET, merge, then
    PUT, so it is not atomic.
  - Lazy `belongsTo` relation accessors, such as `await customer.company()`.
  
  Stored fields live under the object's `properties`; the entity exposes them at
  the top level with `id` set to the object id. Responses and inputs are checked
  against the runtime metadata and throw `ValidationError` (`INVALID_RESPONSE` or
  `INVALID_INPUT`) with per-field detail. A record of another object type is
  rejected. Unknown entities throw a `TypeError` listing the known entities.
  `OntologyDefinition` rejects invalid hand-written ontologies at compile time.
  
  Breaking within this release: `create(id, input)` is now `put(id, input)`, and
  `create(input)` generates the id. `hasOne` relations are removed. The runtime
  metadata requires `objectTypeIds` and has the shape `OntologyRuntime<O>`.
  Existing calls without a type argument are unchanged.
  
  `@frontal-labs/core`: `preserveKeys` now applies to each element of a list
  response, so property names inside `properties` are kept exactly as sent.

### Patch Changes

- Updated dependencies [8baca7b]
  - @frontal-labs/ontology@1.1.0
  - @frontal-labs/core@1.1.1

## 2.0.0

### Major Changes

- e4a35e6: `new Frontal({ apiKey, ... })` — the unified client now accepts an `SdkConfig` directly (validated at construction; `frt_` prefix enforced) as well as a shared `FrontalClient`. Adds `f.client` for sharing the transport with standalone packages, `resolveSdkConfig`, `sdkConfigSchema`, `FrontalEnvironment`, and re-exports of common helpers (`tool`, `toUIMessageStreamResponse`, `toApprovalStep`, `isFrontalError`, …). The env-driven `frontal` singleton and per-service singleton re-exports are deprecated (runtime kept). README rewritten as the canonical quickstart. Fixes `main`/`require` pointing at a non-existent `dist/index.cjs` and removes a bogus `bin` entry.
  
  **Breaking (inherited from the service packages):** `f.agents.use(id).watch()` yields discriminated parts instead of raw SSE envelopes, `f.agents.define(...).create()` returns a typed accessor, and `f.ai.streamText()`'s `textStream`/`fullStream` are two views of one request. See the `@frontal-labs/agents` and `@frontal-labs/ai` changesets.

### Patch Changes

- Updated dependencies [b1c3216]
- Updated dependencies [4b90ce4]
- Updated dependencies [d0edb12]
- Updated dependencies [d7c7a05]
- Updated dependencies [5fd277e]
- Updated dependencies [6bb6903]
- Updated dependencies [6bb6903]
- Updated dependencies [e4a35e6]
- Updated dependencies [e4a35e6]
- Updated dependencies [e4a35e6]
- Updated dependencies [e4a35e6]
- Updated dependencies [e4a35e6]
- Updated dependencies [af9e479]
- Updated dependencies [8d0c43f]
- Updated dependencies [f50d2da]
  - @frontal-labs/ai@0.2.0
  - @frontal-labs/audit@1.0.0
  - @frontal-labs/blob@1.1.0
  - @frontal-labs/agents@2.0.0
  - @frontal-labs/core@1.1.0
  - @frontal-labs/webhooks@1.0.0
  - @frontal-labs/workflows@1.0.0
  - @frontal-labs/ontology@1.0.4
  - @frontal-labs/pipelines@0.0.6
  - @frontal-labs/auth@1.0.4

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
