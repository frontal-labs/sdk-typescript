# @frontal-labs/ontology

## 1.0.1

### Patch Changes

- Bundle `@frontal-labs/_core` into the published JS output instead of leaving it as an external dependency. Replace `workspace:*` protocol with proper `^` semver ranges so packages can be installed from npm without errors.

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
  - @frontal-labs/_core@1.0.2

## 0.0.1

### Patch Changes

- Initial public release. Build system refactored: composite TypeScript project
  references enabled across all packages, type declarations generated via tsc,
  npm provenance configured, GitHub Actions CI/CD pipeline with Changesets
  integration.
- Updated dependencies
  - @frontal-labs/_core@1.0.1
