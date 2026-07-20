# @frontal-labs/workflows

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
