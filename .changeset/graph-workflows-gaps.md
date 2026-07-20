---
"@frontal-labs/graph": minor
"@frontal-labs/workflows": minor
---

Close remaining coverage gaps against the spec.

- **graph**: add `bulkRead` (`/ontology/graph/graph/bulk-read`), relationship
  `getRelationship`/`updateRelationship` (`/ontology/graph/relationships/{id}`),
  async `run(runId)` status, and `capabilities`/`health`/`info`.
- **workflows**: add `executionSummary` (`/v1/workflows/{id}/{run}/summary`).
