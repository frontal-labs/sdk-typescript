# @frontal-labs/workers

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
