# @frontal-labs/ontology

## 1.2.1

### Patch Changes

- 65ab31f: Resolves the last error-plan items.
  
  - `CircuitBreakerOpenError` is built through `createErrors`. Its constructor takes either the retry window in milliseconds, as before, or a message with options. `instanceof` holds for both.
  - `typeErrorWithCode(code, message)` creates a `TypeError` with a stable code. `invalidRequestError` uses it. Workflow response-shape errors carry `invalid_response`, and zstd without runtime support carries `unsupported_runtime`. `instanceof TypeError` still holds for all of them.
- 9d7ab5e: Edge and Deno runtime checks, and stable codes for argument errors.
  
  - Polling timeouts keep code `TIMEOUT` and carry `metadata.operation === "poll"`, so existing `code === "TIMEOUT"` checks keep working. A distinct polling code is planned for the next major.
  - `invalidRequestError(message)` creates the `TypeError` that SDK argument validation throws, with code `invalid_request`. `instanceof TypeError` still holds. `ai` (`generateText` and `streamText` with neither a prompt nor messages) and `ontology` (entity and relation definitions and arguments) now throw it.
  - `TimeoutError` accepts an options object, so a code and a fix can be set when it is created.
  - `@frontal-labs/core` is verified in workerd (Miniflare, no compatibility flags) and Deno 2.9.8. Both checks run in CI.
- Updated dependencies [8b754dd]
- Updated dependencies [b635776]
- Updated dependencies [dbb006f]
- Updated dependencies [65ab31f]
- Updated dependencies [9d7ab5e]
- Updated dependencies [84bb9b7]
  - @frontal-labs/core@1.2.0

## 1.2.0

### Minor Changes

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

- 8c7c840: Declarations resolve under `moduleResolution: nodenext`. The build now adds
  explicit `.js` extensions to relative imports in emitted `.d.ts` files, so
  `new Frontal()` is typed for NodeNext consumers instead of silently `any`.
  Runtime code is unchanged.
- Updated dependencies [3ead735]
- Updated dependencies [8c7c840]
  - @frontal-labs/core@1.1.2

## 1.1.0

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
  - @frontal-labs/core@1.1.1

## 1.0.4

### Patch Changes

- e4a35e6: Fix `main`/`exports.require` pointing at `dist/index.cjs`, which tsup never emitted for these packages (CommonJS consumers got a missing-file error). They now point at the emitted `dist/index.js`.
- Updated dependencies [d7c7a05]
- Updated dependencies [6bb6903]
- Updated dependencies [e4a35e6]
- Updated dependencies [af9e479]
- Updated dependencies [f50d2da]
  - @frontal-labs/core@1.1.0

## 1.0.3

### Patch Changes

- Relicense all packages under Apache-2.0 (previously MIT).
- Updated dependencies
  - @frontal-labs/core@1.0.4

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

- ca0a261: Rebuild the ontology client against the real Ontology platform API. Previously
  nearly every method routed to a single generic `/ontology/engine/runs` endpoint
  (a catch-all stub, ~6% real coverage).

  The client now exposes one namespace per real subdomain service, each with the
  shared `capabilities`/`health`/`info`/`runs` envelope plus its resources:

  - `engine` — `generate`, `validate`, `export`, `exportShacl`, `inferClasses`,
    `inferProperties`, `compareVersions`
  - `objects` — object-type and object read/put/delete + listing
  - `relationships` — relationship-type and relationship read/put/delete
  - `schemas` — schema CRUD + `validate`
  - `versions` — versions, `compare`, release bundles, `audit/verify`
  - `validation` — validation rules + `validatePayload`
  - `transformations` — `create`
  - `reasoning` — `explain`, `facts`, `reasonForward`/`reasonBackward`, rules CRUD
  - `rollouts` — rollout CRUD + `start`/`pause`/`resume`/`rollback`/`status`
  - `rollups` — rollup CRUD + `execute`/`preview`/`result` + execution results
  - `extract` — `analyze`/`architecture`/`coreferences`/`entities`/`events`/`relations`/`triplets`
  - `events` — event log, checkpoints, and consumer leases

  The graph subdomain remains served by `@frontal-labs/graph`. The old
  model/migration/rule/mixin/generation surface (which called the catch-all
  endpoint) is removed.

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
